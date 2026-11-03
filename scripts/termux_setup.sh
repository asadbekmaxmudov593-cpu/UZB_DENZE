#!/bin/bash
# Android telefonda (Termux -> Ubuntu ichida) o'rnatish skripti.
# Ishlatish (Ubuntu ichida, repo papkasida):  bash scripts/termux_setup.sh
#
# Ubuntu'ning yangi versiyasida Python 3.14 bor, lekin ba'zi kutubxonalar
# (pydantic-core, ntgcalls) unga hali tayyor emas. Shuning uchun bepul «uv»
# vositasi orqali alohida Python 3.13 o'rnatamiz.
set -e
export DEBIAN_FRONTEND=noninteractive
apt update
apt install -y curl ca-certificates ffmpeg git nano

if ! command -v uv >/dev/null 2>&1; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="$HOME/.local/bin:$PATH"

rm -rf .venv
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python -r requirements.txt -r requirements-caller.txt

[ -f .env ] || cp .env.example .env
echo
echo "✅ O'rnatildi. Endi:  nano .env   (API_ID, API_HASH, CALL_CONTACTS ni yozing)"
echo "So'ng:              . .venv/bin/activate && python -m caller"
