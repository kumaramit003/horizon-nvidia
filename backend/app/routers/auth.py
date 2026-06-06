from __future__ import annotations

import asyncio
import secrets
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr

from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
SESSION_DAYS = 30


class GoogleLoginRequest(BaseModel):
    credential: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str = ""
    picture: str = ""


class AuthResponse(BaseModel):
    token: str
    user: UserOut


@router.get("/config")
async def config():
    return {"google_client_id": settings.google_client_id}


@router.post("/google", response_model=AuthResponse)
async def google_login(body: GoogleLoginRequest):
    if not settings.google_client_id:
        raise HTTPException(503, "Google Sign-In is not configured")

    payload = await verify_google_id_token(body.credential)
    user = await upsert_google_user(payload)
    token = await create_session(user["_id"])

    return AuthResponse(token=token, user=user_to_out(user))


@router.get("/me", response_model=UserOut)
async def me(user: Annotated[dict, Depends(current_user)]):
    return user_to_out(user)


@router.post("/logout")
async def logout(authorization: Annotated[str | None, Header()] = None):
    token = bearer_token(authorization)
    if token:
        db = get_db()
        await db.sessions.delete_one({"token": token})
    return {"ok": True}


async def current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    token = bearer_token(authorization)
    if not token:
        raise HTTPException(401, "Missing bearer token")

    db = get_db()
    now = datetime.now(timezone.utc)
    session = await db.sessions.find_one({"token": token, "expires_at": {"$gt": now}})
    if not session:
        raise HTTPException(401, "Invalid or expired session")

    user = await db.users.find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def verify_google_id_token(id_token: str) -> dict:
    query = urllib.parse.urlencode({"id_token": id_token})
    url = f"{GOOGLE_TOKENINFO_URL}?{query}"

    try:
        payload = await asyncio.to_thread(fetch_json, url)
    except Exception as exc:
        raise HTTPException(401, f"Google token verification failed: {exc}") from exc

    if payload.get("aud") != settings.google_client_id:
        raise HTTPException(401, "Google token audience does not match this app")

    if payload.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(401, "Google token issuer is invalid")

    if payload.get("email_verified") not in {True, "true", "True"}:
        raise HTTPException(401, "Google account email is not verified")

    return payload


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=10) as response:
        import json

        return json.loads(response.read().decode("utf-8"))


async def upsert_google_user(payload: dict) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    google_sub = payload["sub"]
    email = payload["email"]
    update = {
        "$set": {
            "provider": "google",
            "google_sub": google_sub,
            "email": email,
            "name": payload.get("name", ""),
            "picture": payload.get("picture", ""),
            "email_verified": True,
            "last_login_at": now,
            "updated_at": now,
        },
        "$setOnInsert": {
            "created_at": now,
        },
    }

    await db.users.update_one({"google_sub": google_sub}, update, upsert=True)
    user = await db.users.find_one({"google_sub": google_sub})
    if not user:
        raise HTTPException(500, "Could not create user")
    return user


async def create_session(user_id) -> str:
    db = get_db()
    token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    await db.sessions.insert_one({
        "token": token,
        "user_id": user_id,
        "created_at": now,
        "expires_at": now + timedelta(days=SESSION_DAYS),
    })
    return token


def bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def user_to_out(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        email=user["email"],
        name=user.get("name", ""),
        picture=user.get("picture", ""),
    )
