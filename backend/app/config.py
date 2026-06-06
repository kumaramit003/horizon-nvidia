from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "founderos"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3001"]

    # LLM endpoint — Nebius (hosted) is the active default. NVIDIA NIM vars
    # are kept as a fallback if NEBIUS_* are blank.
    nebius_api_key: str = ""
    nebius_base_url: str = "https://api.tokenfactory.nebius.com/v1"
    nebius_model: str = "nvidia/Nemotron-3-Ultra-550b-a55b"

    nvidia_api_key: str = "not-needed"
    nvidia_base_url: str = "http://localhost:8080/v1"
    nvidia_model: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

    @property
    def llm_api_key(self) -> str:
        return self.nebius_api_key or self.nvidia_api_key

    @property
    def llm_base_url(self) -> str:
        return self.nebius_base_url if self.nebius_api_key else self.nvidia_base_url

    @property
    def llm_model(self) -> str:
        return self.nebius_model if self.nebius_api_key else self.nvidia_model

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
