# 🔐 AuthVault – Authentication UI System

A modern and responsive **Authentication UI** built using **HTML, CSS, JavaScript, and Python**, featuring login/register functionality, real-time validation, and password strength checking using localStorage.

🌐 **Live Demo:**
👉 https://abdurrahmancce.github.io/AuthVault/

---

## 🚀 Features

* 🔑 Login & Register system
* ✅ Real-time form validation
* 🔒 Password strength checker (Weak / Medium / Strong)
* 💾 LocalStorage-based authentication
* 👁️ Show/Hide password toggle
* 🔁 Session management (Login/Logout)
* 📱 Fully responsive design
* 🎨 Clean and modern UI/UX

---

## 🧠 How It Works

* User registers with name, email, and password
* Data is stored in browser **localStorage**
* Login system validates credentials from stored data
* Password strength is checked dynamically while typing
* User session is maintained until logout

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend (Basic):** Python
* **Storage:** Browser LocalStorage

---

## 📂 Project Structure

```bash
AuthVault/
│
├── index.html        # Main UI (Login/Register)
├── style.css         # Styling & responsiveness
├── script.js         # Logic & validation
├── server.py         # Python backend (optional/demo)

```

---

## 🔐 Password Strength Logic

The system checks password based on:

* Length (minimum 8 characters)
* Uppercase letters
* Lowercase letters
* Numbers
* Special characters

| Strength | Condition                              |
| -------- | -------------------------------------- |
| Weak     | Only basic characters                  |
| Medium   | Mix of letters + numbers               |
| Strong   | Includes special characters + full mix |

---

## ⚙️ Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/abdurrahmancce/AuthVault.git
cd AuthVault
```

### 2. Run Frontend

Simply open:

```bash
index.html
```

### 3. Run Python Backend (Optional)

```bash
python server.py
```

---

## 📸 Screenshots

> UI 

<img width="1920" height="943" alt="image" src="https://github.com/user-attachments/assets/8b1bf096-59ab-4b50-8682-8d144a350b8c" />

> Login Page 

<img width="1920" height="878" alt="image" src="https://github.com/user-attachments/assets/9af9867a-e5a8-4c6f-ac1f-339b0f12785e" />

---

## 🎯 Learning Outcomes

This project helps you understand:

* Authentication flow (frontend level)
* Form validation techniques
* LocalStorage usage
* Password security basics
* Responsive UI design

---

## ⚡ Future Improvements

* 🔐 JWT Authentication (real backend)
* 📧 Email verification system
* 🌙 Dark/Light mode toggle
* 🔗 Social login (Google, GitHub)
* 🗄️ Database integration (MongoDB/MySQL)

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork this repo and improve the project.

---

## 📄 License

This project is open-source and available under the **MIT License**.

---

## 👨‍💻 Author

**Abdur Rahman**

🎓 CCE Student | Web Developer | Tech Enthusiast

* GitHub: https://github.com/abdurrahmancce
* Portfolio: https://abdurrahmancce.github.io/Personal-Resume-Website/

---

⭐ If you like this project, give it a star and share it!
