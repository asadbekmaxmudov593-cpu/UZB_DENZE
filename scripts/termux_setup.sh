#!/bin/bash
# Android telefonda (Termux -> Ubuntu ichida) o'rnatish skripti.
# Ishlatish (Ubuntu ichida, repo papkasida):  bash scripts/termux_setup.sh
set -e
apt update
apt install -y python3 python3-pip python3-venv ffmpeg git nano
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt -r requirements-caller.txt
[ -f .env ] || cp .env.example .env
echo
echo "✅ O'rnatildi. Endi:  nano .env   (API_ID, API_HASH, CALL_CONTACTS ni yozing)"
echo "So'ng:              . .venv/bin/activate && python -m caller"
