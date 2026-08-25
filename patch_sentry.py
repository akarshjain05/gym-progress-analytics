import re

with open('backend/app/main.py', 'r') as f:
    content = f.read()

old_sentry = """    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )"""

new_sentry = """    def scrub_data(event, hint):
        # Scrub potentially sensitive health metrics or PII from requests
        if 'request' in event and 'data' in event['request']:
            event['request']['data'] = '[Scrubbed]'
        return event

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        send_default_pii=False,
        before_send=scrub_data
    )"""

content = content.replace(old_sentry, new_sentry)

with open('backend/app/main.py', 'w') as f:
    f.write(content)
