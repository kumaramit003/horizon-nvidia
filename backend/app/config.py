from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "founderos"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3001"]

    # LLM endpoint — Nebius (hosted) is the active default. Per-persona keys
    # let Flora use a fast small model for chat and Finn use a bigger model
    # for analysis. Generic NEBIUS_API_KEY is the catch-all.
    nebius_base_url: str = "https://api.tokenfactory.nebius.com/v1"
    nebius_api_key: str = ""
    nebius_model: str = "nvidia/Nemotron-3-Ultra-550b-a55b"

    nebius_api_key_flora: str = ""
    nebius_model_flora: str = "nvidia/Nemotron-3-Nano-Omni"
    nebius_api_key_finn: str = ""
    nebius_model_finn: str = "nvidia/Nemotron-3-Ultra-550b-a55b"

    # NVIDIA NIM fallback if no NEBIUS_* key is set
    nvidia_api_key: str = "not-needed"
    nvidia_base_url: str = "http://localhost:8080/v1"
    nvidia_model: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

    def llm_config_for(self, persona: str) -> dict:
        """Return {api_key, base_url, model} for a given persona (flora|finn)."""
        if persona == "flora":
            key = self.nebius_api_key_flora or self.nebius_api_key
            model = self.nebius_model_flora or self.nebius_model
        elif persona == "finn":
            key = self.nebius_api_key_finn or self.nebius_api_key
            model = self.nebius_model_finn or self.nebius_model
        else:
            key = self.nebius_api_key
            model = self.nebius_model
        if key:
            return {"api_key": key, "base_url": self.nebius_base_url, "model": model}
        # Fall back to NVIDIA NIM
        return {"api_key": self.nvidia_api_key, "base_url": self.nvidia_base_url, "model": self.nvidia_model}

    # ElevenLabs voice synthesis (TTS). Optional — if any of these are
    # blank the /api/voice/tts endpoint returns 503 and the frontend
    # falls back to text-only mode.
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id_flora: str = ""
    elevenlabs_voice_id_finn: str = ""
    elevenlabs_model_id: str = "eleven_flash_v2_5"

    # Google Sign-In OAuth Web Client ID. This is not a secret.
    google_client_id: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
