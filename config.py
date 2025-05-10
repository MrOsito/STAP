import os

CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "6v98tbc09aqfvh52fml3usas3c")
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-2")
USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "ap-southeast-2_XXXXXX")
MEMBERS_URL = "https://members.terrain.scouts.com.au"
EVENTS_API_URL = "https://events.terrain.scouts.com.au"
