document.addEventListener("DOMContentLoaded", () => {
    checkLoginStatus();
});

// Function to register a user
async function registerUser() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (response.ok) {
        alert("Registration successful! Please log in.");
    } else {
        alert("Registration failed: " + (data.error || "Unknown error"));
    }
}

// Function to log in a user
async function loginUser() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        // Store user info in localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        showFileSection(data.user.name);
    } else {
        alert("Login failed: " + (data.error || "Unknown error"));
    }
}

// Function to check if the user is logged in (from localStorage)
function checkLoginStatus() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        showFileSection(user.name);
    }
}

// Function to show S3 files for the logged-in user
async function showFileSection(username) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("file-section").style.display = "block";
    document.getElementById("username").innerText = username;

    const response = await fetch("/files");
    const files = await response.json();

    const fileList = document.getElementById("s3-files");
    fileList.innerHTML = ""; // Clear the list before adding new files

    // Add file links to the file list
    files.forEach(file => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}" target="_blank">${file.Key}</a>`;
        fileList.appendChild(li);
    });
}

// Function to log out user
function logoutUser() {
    // Clear user data from localStorage
    localStorage.removeItem("user");

    // Hide file section and show auth section again
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("file-section").style.display = "none";
}

// Function to upload a file to S3
async function uploadFile(event) {
    event.preventDefault();

    const fileInput = document.getElementById("fileUpload");
    const file = fileInput.files[0]; // Get the first file from the input

    if (!file) {
        alert("Please choose a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (response.ok) {
        alert("File uploaded successfully!");
        showFileSection(JSON.parse(localStorage.getItem("user")).name); // Refresh the file list
    } else {
        alert("File upload failed: " + (data.error || "Unknown error"));
    }
}
