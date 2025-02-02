# **API Documentation**

Actual on 16.12.2024

### **Standard Response Format**

All responses from the API will follow the standard format:

```
{
    "error": bool,    // Indicates if there was an error (default is false)
    "msg": string,    // A message to describe the result or error
    "url": string,    // A URL for redirection, default is null
    "data": {}        // Data object containing the response data (can be empty)
}
```

---

## **Authentication (Auth)**

## /api/auth/*


### **Login**
`POST /api/auth/login`

**Request Body**:
```
{
    "username": string,   // The username of the user
    "password": string    // The password of the user
}
```

**Responses**:

- **200 OK**:
```
{
    "error": false,
    "msg": "Login successful",
    "url": string,  // Optional redirect URL
    "data": {
        "jwt": string  // The JWT token for authenticated requests
    }
}
```

- **401 Unauthorized**:
```
{
    "error": true,
    "msg": "Invalid credentials",
    "url": null,
    "data": {}
}
```

---

### **Register**
Steps
- Register mail
- Verify mail
- Finish mail


`POST /api/auth/register`

**Request Body**:
```json
{
    "mail": "",       // User's email address
    "password": ""    // Account password (min 8 characters)
}
```

**Responses**:

- **200 OK**:
```json
{
    "error": false,
    "msg": "Registration successful",
    "url": "string",  // URL for the next step, if applicable
    "data": {}
}
```

- **400 Bad Request**:
```json
{
    "error": true,
    "msg": "Invalid email or password",
    "url": null,
    "data": {}
}
```

- **409 Conflict**:
```json
{
    "error": true,
    "msg": "Email already exists",
    "url": null,
    "data": {}
}
```

---

### **Confirm Email**
`POST /api/auth/confirm`

**Request Body**:
```json
{
    "code": "string"
}
```


**Responses**:

- **200 OK**:
```json
{
    "error": false,
    "msg": "Email confirmed successfully",
    "url": "string",  // URL to redirect after confirmation
    "data": {}
}
```

- **400 Bad Request**:
```json
{
    "error": true,
    "msg": "Invalid or expired token",
    "url": null,
    "data": {}
}
```

---

### **Finish Registration**
`POST /api/home/registerfinish`

**Request Headers**:
- **Authorization**: Bearer `jwt_token`

Password requried (min 8 characters)
**Request Body**:
```json
{
    "username": "",
    "password": ""
}
```

**Responses**:

- **200 OK**:
```json
{
    "error": false,
    "msg": "Username created successfully",
    "url": null,
    "data": {}
}
```

- **409 Conflict**:
```json
{
    "error": true,
    "msg": "Username already taken",
    "url": null,
    "data": {}
}
```
- **400 Bad request**
```json
{
    "error": true,
    "msg": "Password require 8 symb",
    "url": null,
    "data": {}
}
```

---

### **Logout**
`POST /api/auth/logout`

**Request Headers**:
- **Authorization**: Bearer `jwt_token`

**Response**:
- **200 OK**:
```
{
    "error": false,
    "msg": "Logged out successfully",
    "url": null,
    "data": {}
}
```

- **401 Unauthorized**:
```
{
    "error": true,
    "msg": "Invalid JWT token",
    "url": null,
    "data": {}
}
```

---

## **Home**

### **Home Page**
`GET /api/home`

**Request Headers**:
- **Authorization**: Bearer `jwt_token`


- **200 OK**:
```
{
    "error": false,
    "msg": "Home data fetched successfully",
    "url": null,
    "data": {
        "Username": "Coffee",               // The username of the user
        "Uuid": "00000000-0000-0000-0000-000000000000",  // Unique identifier for the user
        "Selected_Cape": 0,                 // ID of the selected cape
        "Selected_Skin": 0,                 // ID of the selected cape
        "PermLvl": 0
        "Capes": [
            {
                "Id": 0,
                "Name": "youtube"
            }
        ],                                  // Array of capes available to the user
        "Skin": [
            {
                "Id": 0,
                "Name": "youtube"
            }
        ],     
        "Discord_integration": true,        // Whether the user has Discord integration enabled
        "Discord": {
            "Discord_Global_Name": "",     // The global Discord username
            "Discord_Ava": ""              // The Discord avatar URL
        },
        "Mail_verification": true           // Whether the email is verified
    }
}
```

- **401 Unauthorized**:
```
{
    "error": true,
    "msg": "Invalid JWT token",
    "url": null,
    "data": {}
}
```
---

- **403 Forbidden**:
```
{
    "error": true,
    "msg": "Account is not finished",
    "url": null,
    "data": {
        "password_create": true,
        "username_create": true
    }
}
```

### **Edit User Details**
`POST /api/home/edit`

**Request Headers**:
- **Authorization**: Bearer `jwt_token`

**Request Body Options**:

- **For change settings**:

options can be 
``username`` requried password
``password`` requried old_password
``cape``
upload skin via form html

<details>
<summary>Examples</summary>
<br>

- **Update Username and Password**:
```
{
    "action": "update_username",
    "username": "new_username",
    "password": "current_password"
}
```

- **Change Password**:
```
{
    "action": "change_password",
    "password": "current_password",
    "new_password": "new_password"
}
```

- **Change Cape**:
```
{
    "action": "change_cape",
    "cape": 1
}
```
</details>

#### **Upload Skins**
`POST /api/home/edit/upload`

**Request Headers**:
- **Authorization**: Bearer `jwt_token

**Request Body form**:
```
{   
    "skin": file
    "slim": "true | false"
}
```


<details>
<summary>Mail example</summary>
<br>
1. **Update mail**

- **100 Continue**
```json
{
    "action": "update_mail",
}
```

- **100 Continue**
```json
{
    "action": "update_mail_1",
    "code": "",
    "new_mail": "",
    "password": ""
}
```

- **100 Continue**
```json
{
    "action": "update_mail_2",
    "code": "",
}
```


response
```json
{
    "error": false,
    "msg": "{Action} successfully",
    "url": null,
    "data": {}
}
```


- **400 Bad request**
```json
{
    "error": true,
    "msg": "{ Action error }",
    "url": null,
    "data": {}
}
```
</details>

**Response**:

- **200 OK**:
```
{
    "error": false,
    "msg": "{Action} successfully",
    "url": null,
    "data": {}
}
```

- **401 Unauthorized**:
```
{
    "error": true,
    "msg": "{ Action error }",
    "url": null,
    "data": {}
}
```

---

### **Verify Email**
`POST /api/auth/verify-email`

**Request Headers**:
- **Authorization**: Bearer `jwt_token`

**Request Body**:
```
{
    "verify_code": string  // The verification code received in the email
}
```

**Response**:

- **200 OK**:
```
{
    "error": false,
    "msg": "Email verified successfully",
    "url": null,
    "data": {}
}
```

- **401 Unauthorized**:
```
{
    "error": true, 
    "msg": "Invalid or expired verification code",
    "url": null,
    "data": {}
}
```

---

## **Discord Integration**

### **GET /discord/url**

```
{
    "error": false,
    "msg": "",
    "url": "",
    "data": {
        "link": ""
    }
}
```



### **Discord Integration Settings**
`POST /home/discord`

**Request Body**:
```
{
    "discord_integration": true | null,  // Enable or disable Discord integration
    "password": "string | null"          // Current password (only required if updating integration settings)
}
```

**Response**:

- **200 OK**:
```
{
    "error": false,
    "msg": "Discord integration settings updated",
    "url": string,  // Discord integration URL to complete the setup
    "data": {}
}
```

- **400 Bad Request**:
```
{
    "error": true,  // error indicating an error
    "msg": "Invalid request or missing password",
    "url": null,
    "data": {}
}
```

---

## **Admin Endpoints**

### **Users List**
`GET /api/admin/users`

**Request Headers**:
- **Authorization**: Bearer `jwt_token`

**Response**:

- **200 OK**:
```
{
    "error": false,
    "msg": "Users fetched successfully",
    "url": null,
    "data": [
        {
            "username": string,   // Username of the user
            "uuid": string        // Unique identifier for the user
        }
    ]
}
```

- **403 Forbidden**:
```
{
    "error": true,
    "msg": "You do not have permission to view the user list",
    "url": null,
    "data": {}
}
```

---

### **Get Specific User**
`GET /api/admin/user/{identifier}`

**Request Headers**:
- **Authorization**: Bearer `jwt_token`

**Response**:

- **200 OK**:
```
{
    "error": false,
    "msg": "User details fetched successfully",
    "url": null,
    "data": {
        "username": string,                // Username of the user
        "uuid": string,                    // Unique identifier for the user
        "selected_cape": 0,                // ID of the currently selected cape
        "capes": [
            {
                "id": 0                      // Cape ID
            }
        ],                                   // List of capes associated with the user
        "discord": {
            "discord_id": "int"              // Discord ID of the user
        },
        "mail_verification": true,           // Email verification status
        "mail": string                     // User's email address
    }
}
```

- **403 Forbidden**:
```
{
    "error": true,
    "msg": "You do not have permission to access this user's details",
    "url": null,
    "

data": {}
}
```




### **Send Mail to All Users**
`POST /api/admin/mail`

**Request Headers**:
- **Authorization**: Bearer `jwt_token`

**Request Body**:
```
{
    "subject": string,       // Subject of the email
    "message": string        // The body content of the email
}
```

**Response**:

- **200 OK**:
```
{
    "msg": "Email sent successfully to all users"
}
```

- **403 Forbidden**:
```
{
    "error": true,
    "msg": "You do not have permission to send emails to all users"
}
```

### **Update User Role**

`POST /api/admin/user/role/{identifier}`

This endpoint allows an admin to update the role level (`role_level`) of a user and optionally set an expiration date (`expired_at`).

**Request Headers**:
- **Authorization**: Bearer `jwt_token`

**Request Body**:
```json
{
    "user": 1,
    "role_level": 1,        // New role level (1, 2, or 3)
    "expired_at": 1731798166    // Optional: Expiry date in ISO 8601 format (if not provided, role will be permanent)
}
```

**Responses**:

- **200 OK**:
```json
{
    "error": false,
    "msg": "User role and expiration updated successfully",
    "url": null,
    "data": {
        "id": 1,                  // User's unique identifier
        "new_role_level": 3,            // The updated role level
        "expired_at": 1731798166  // Expiry date if provided
    }
}
```

- **400 Bad Request**:
```json
{
    "error": true,
    "msg": "Invalid role level or expired_at must be a valid future date",
    "url": null,
    "data": {}
}
```

- **403 Forbidden**:
```json
{
    "error": true,
    "msg": "You do not have permission to update this user's role",
    "url": null,
    "data": {}
}
```

---

### **Optional Expiry Field**:

If the `expired_at` field is not provided, the role update will be permanent for the user. The expiry date must always be in the future if it is included.

---

### **Update User Role**

`POST /api/admin/user/cape/{identifier}`


**Request Headers**:
- **Authorization**: Bearer `jwt_token`

**Request Body**:
```json
{
    "user": 1,
    "cape": []
}
```

**Responses**:

- **200 OK**:
```json
{
    "error": false,
    "msg": "User role and expiration updated successfully",
    "url": null,
    "data": {
        "id": 1,                  // User's unique identifier
        "new_role_level": 3,            // The updated role level
        "expired_at": 1731798166  // Expiry date if provided
    }
}
```

- **400 Bad Request**:
```json
{
    "error": true,
    "msg": "Invalid role level or expired_at must be a valid future date",
    "url": null,
    "data": {}
}
```

- **403 Forbidden**:
```json
{
    "error": true,
    "msg": "You do not have permission to update this user's role",
    "url": null,
    "data": {}
}
```

---

### **Get all skins**

## User permissions lvl


|                 | 1 lvl | 2 lvl | 3 lvl |
|-----------------|-------|-------|-------|
| change username | +     | +     | +     |
| Change skin     | +     | +     | +     |
| Change skin HD  | -     | +     | +     |
| Change mail     | +     | +     | +     |
| Change Password | +     | +     | +     |
| Use Discord     | +     | +     | +     |
|                 |       |       |       |
| **Admin**       |       |       |       |
| Users list      | -     | -     | +     |
| User            | -     | -     | +     |
| Mail Spam       | -     | -     | +     |

types of permissions

- settings.{name}

- page.{name}


### Skins logic

User send request to upload skin and check if user have permission to upload skin HD skin if yes then upload HD skin if no then upload normal skin with parameters

### Skin lib
```sql
INSERT INTO `skins_lib` (`id`, `uid`, `name`, `fn`, `slim`) VALUES
(1, 123456789012345678, 'Default Skin', '550e8400-e29b-41d4-a716-446655440000'),
```

### Skin user
```sql
INSERT INTO `skins_user` (`id`, `uid`, `skin_id`, `uuid`, `slim`, `locked`) VALUES
(1, 123456789012345678, 1, '00000000-0000-0000-0000-000000000000', 0, 0),
```

id - skin id
uuid - user uuid
slim - 1 or 0
locked - 1 or 0

## **Service Endpoints**

#### **Find user account**
`POST /api/service/user`

**Request Headers**:
- **Authorization**: Bearer `ServiceApiToken`

**Request Body**:
```
{
    "Discord_id": Int,       // Subject of the email
    "Playername": string        // The body content of the email
}
```

**Response**:

- **200 OK**:
```
{
    "discord": {
        "username": "",
        "id": ""
    },
    "account": {
        "username": ""
        "uuid": ""
    }
}
```

- **403 Forbidden**:
```
{
    "error": true,
    "msg": "You do not have permission to do this."
}
```



# discord oauth 2


1. get discord link /discord/url
2. discord will redirect code to frontend /code
3. frontend will redirect code to backend /discord/code
4. backend will get information about user and return data
```
{
    "error": false,
    "msg": "",
    "url": null,
    "data": {
        "urlAvatar": "string",                  // User's unique identifier
        "username": "string",
        "verifyCode": "string"  // Expiry date if provided
    }
}
```
5. frontend will send this body
```
{
    "verifyCode": string,
    "password": string    // Account password (min 8 characters)
}
```
6. backend will answer

- **200 OK**:
```
{
    "error": false,
    "msg": "Registration successful",
    "url": string,  // URL for the next step, if applicable
    "data": {}
}
```



# verify_codes

value for action

1 - verify mail
2 - create password
<!-- 3 - change password -->
4 - forget password


line of changing mail


verify old mail > verify your password > verify new password

line of changing discord


**Connecting Discord to Your Account:**  
- **New Connection**: Log into the Discord account you wish to connect.  
- **Requirements**:  
  - The Discord account must have the **same email** as your current account.  

**Changing Discord Connection:**  
- Disconnect the old account if necessary.  
- Follow the steps above to connect a new Discord account.

**Changing/Removing Discord Connection:**  
1. **Remove Current Connection**:  
   - Enter the **code sent to your email**.  
   - Confirm by entering your **current password**.

2. **Change Connection**:  
   - Verify the **code from your old email**.  
   - Enter your **password**.  
   - Log in to the new Discord account and confirm the change.


**Creating Account via Discord:**  
1. Click "Sign Up with Discord" and log into your Discord account.  
2. Authorize the application.  
3. Verify your email address.  
4. Set and confirm a new password to complete the account creation.


# webhooks

```yml
AuditSecret: 
  url: https://
  spamming: id # here will be send created account
  audit: id # main information change password change mail etc
```













# BugScout

## **Logger for console**

`WS /ws/debug?type=logger`

nothing send only read information

## **SQL executer**
`WS /ws/debug?type=sql`

execute and get information which returned

```json
{
    "sql": ""
}
```

#### **Database func**

`WS /ws/debug?type=database`

```json
{
    "data": "tables or {name_of_table}" 
}
```