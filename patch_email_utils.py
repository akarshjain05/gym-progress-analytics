import re

with open('backend/app/email_utils.py', 'r') as f:
    content = f.read()

func_1_old = """    try:
        resp = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[ERROR] Failed to send password reset email via Brevo: {e}")"""

func_1_new = """    from .worker import send_email_task
    send_email_task.delay(to_email, payload["subject"], payload["htmlContent"], payload["textContent"])"""

content = content.replace(func_1_old, func_1_new)

func_2_old = """    try:
        resp = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[ERROR] Failed to send verification email via Brevo: {e}")"""

func_2_new = """    from .worker import send_email_task
    send_email_task.delay(to_email, payload["subject"], payload["htmlContent"], payload["textContent"])"""

content = content.replace(func_2_old, func_2_new)

with open('backend/app/email_utils.py', 'w') as f:
    f.write(content)
