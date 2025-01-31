# Instalation

## Docker (better)

``git pull url``

``docker compose up -d`` 


## Manually

# Configuration 



```yml
NameSite: cookiecms
securecode: random(64)
ServiceApiToken: random(64)
MaxSavedSkins: 1
DEBUGLOG: 0 # 0 none, 1 requests, 2 full request with all
debugToken: Your_secret_token
database:
  host: "localhost"
  username: "root"
  pass: "admin"
  db: "cookiecms"
  port: "34002"

smtp:
  host: ""
  SMTPAuth: true
  Username: ""
  Password: ""
  SMTPSecure: ""
  Port: 587

discord:
  enabled: true
  client_id: "1181148727826722816"
  secret_id: "5YaScJyKq0pDQxO_B5YlhUwcBnlkr37P"
  scopes: "identify+email"
  redirect_url: "http://localhost:34000/api/auth/discord"
  bot: ""
  guild_id: 0
  role: 0
  webhooks: ""
```