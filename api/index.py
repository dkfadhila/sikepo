# Vercel serverless entrypoint for SiKePo FastAPI app
# Vercel Python runtime imports `app` from this file.
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "engine"))

from main import app  # noqa: E402  (FastAPI instance)

# Vercel looks for `app` — already imported above.
