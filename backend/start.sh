#!/bin/bash
echo "Activating Python 3.12 environment..."
source ./venv/bin/activate
echo "Starting Django server..."
python manage.py runserver
