from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://mongo:27017"
    database_name: str = "founderos"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    nvidia_api_key: str = "not-needed"
    nvidia_base_url: str = "http://localhost:8080/v1"
    nvidia_model: str = "nvidia/llama-3.1-nemotron-70b-instruct"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
