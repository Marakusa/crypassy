// Initialize socket.io connection
const socket = io();

var username = "";
var password = "";

var data = [];
socket.on("message", (message) => {
    alert(message);
});

socket.on("authorized", (success, message) => {
    if (!success) {
        document.getElementById("authorizating").style.display = "none";
        document.getElementById("content").style.display = "none";
        document.getElementById("authorization").style.display = "block";
        document.getElementById("fail").innerText = message;
    }
    else {
        document.getElementById("authorizating").style.display = "none";
        document.getElementById("authorization").style.display = "none";
        document.getElementById("content").style.display = "block";
        document.getElementById("fail").innerText = "";
    }
});

socket.on("passwords", (data) => {
    const passwordList = document.getElementById("passwordList");

    passwordList.innerHTML = "";
    var tableElement = document.createElement("tr");
    var tableElementChild1 = document.createElement("th");
    var tableElementChild2 = document.createElement("th");
    var tableElementChild3 = document.createElement("th");

    tableElement.appendChild(tableElementChild1);
    tableElement.appendChild(tableElementChild2);
    tableElement.appendChild(tableElementChild3);
    
    tableElement.children[0].innerText = "Website";
    tableElement.children[1].innerText = "Username/Email";
    tableElement.children[2].innerText = "Password";

    passwordList.appendChild(tableElement);

    for(var i = 0; i < data.length; i++) {
        var tableElement = document.createElement("tr");
        var tableElementChild1 = document.createElement("td");
        var tableElementChild2 = document.createElement("td");
        var tableElementChild3 = document.createElement("td");
        var passwordText = document.createElement("span");

        const button = "<br><button id=\"reveal" + i.toString() + "\" onclick=\"revealPassword(" + i.toString() + ", 'password" + i.toString() + "');\">Show</button><button id=\"reveal" + i.toString() + "\" onclick=\"removePassword(" + i.toString() + ");\">Delete</button>";
        passwordText.id = "password" + i.toString();
        passwordText.className = "passwordText";

        tableElementChild1.style.userSelect = "all";
        tableElementChild2.style.userSelect = "all";

        tableElement.appendChild(tableElementChild1);
        tableElement.appendChild(tableElementChild2);
        tableElementChild3.appendChild(passwordText);
        tableElementChild3.innerHTML += button;
        tableElement.appendChild(tableElementChild3);
        
        tableElement.children[0].innerText = data[i]["website"];
        tableElement.children[1].innerText = data[i]["username"];
        tableElement.children[2].children[0].innerText = data[i]["password"];

        passwordList.appendChild(tableElement);
    }
});

socket.on("new_account", () => {
    console.log("No account found");
    document.getElementById("fail").innerText = "No account found. Create new by authorizing with new credentials.";
});

socket.on("gotpassword", (passwordId, password) => {
    console.log(passwordId);
    console.log(password);
    const passwordText = document.getElementById(passwordId);
    passwordText.innerText = password;
});

// Webpage code
function authorize() {
    document.getElementById("authorization").style.display = "none";
    document.getElementById("content").style.display = "none";
    document.getElementById("authorizating").style.display = "block";
    document.getElementById("fail").innerText = "";

    username = document.getElementById("username").value;
    password = document.getElementById("password").value;

    socket.emit("authorize", username, password);
}
function revealPassword(index, passwordId) {
    const passwordText = document.getElementById(passwordId);
    const reveal = document.getElementById("reveal" + index);
    
    if (passwordText.innerText == "***") {
        reveal.innerText = "Hide";
        socket.emit("getpassword", username, password, index, passwordId);
    }
    else {
        passwordText.innerText = "***";
        reveal.innerText = "Show";
    }
}
function removePassword(index) {
    if (confirm("Are you sure you want to delete the password?")) {
        socket.emit("removepassword", username, password, index);
    }
}
function addPassword() {
    const newWebsite = document.getElementById("newWebsite").value;
    const newUsername = document.getElementById("newUsername").value;
    const newPassword = document.getElementById("newPassword").value;

    socket.emit("addpassword", newWebsite, newUsername, newPassword);
    cancelAddPassword();
}
function openAddPassword() {
    document.getElementById("newPasswordPanel").style.display = "";
    document.getElementById("newWebsite").value = "";
    document.getElementById("newUsername").value = "";
    document.getElementById("newPassword").value = "";
}
function cancelAddPassword() {
    document.getElementById("newPasswordPanel").style.display = "none";
    document.getElementById("newWebsite").value = "";
    document.getElementById("newUsername").value = "";
    document.getElementById("newPassword").value = "";
}
function randomPassword() {
    const alphabet = "01234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-!@%&/()[]{}+?=";
    var random = "";

    for (var i = 0; i < 20; i++) {
        var character = Math.round(Math.random() * (alphabet.length - 1));
        random += alphabet[character].toString();
    }
    
    document.getElementById("newPassword").value = random;
}
