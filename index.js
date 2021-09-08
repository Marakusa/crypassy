const { Server } = require("socket.io");
const http = require("https");
const fs = require("fs");
const path = require("path");
const r = require("rethinkdb");
const crypto = require("crypto");
const os = require('os');

const passwordDataFile = "data/local.pmd";
var passwordData = [];
var connectionUsername = "";
var connectionPassword = "";

const port = 8800;
const errors = JSON.parse(fs.readFileSync("json/errors.json"));

const nodeVersion = process.version.substring(1);
const serverOS = os.type() + " " + os.release();

// Set SSL keys
var serverOptions =  {
    key: fs.readFileSync("ssl/key.pem"),
    cert: fs.readFileSync("ssl/certificate.pem")
};

// Start HTTP server and socket.io
server = http.createServer(serverOptions, requestListener);
server.listen(port);
console.log("Server started at https://127.0.0.1:" + port);

const io = new Server(server);

// On socket.io client connected
io.on("connection", (socket) =>{
    console.log("User connected");

    // User disconnected
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

    socket.on("authorize", (user, password) => {
        if (!fs.existsSync(passwordDataFile)) {
            if (user.length >= 8, password.length >= 8) {
                var hash = crypto.createHash("RSA-SHA1").update(user + ";" + password + ";" + user.split("").reverse().join("")).digest("hex");
                
                fs.writeFile(passwordDataFile, encryptString(JSON.stringify({"user":user,"password":password,"data":"[]"}), hash), (err) => {
                    if (err) {
                        console.log("Assigning new credentials failed: " + err.message);
                        socket.emit("authorized", false, err.message);
                    }
                    else {
                        console.log("Successfully assigned new credentials.");
                        socket.emit("authorized", true, "Successfully assigned new credentials.");
                        connectionUsername = user;
                        connectionPassword = password;
                        passwordData = [];
                    }
                });
            }
            else {
                socket.emit("authorized", false, "Keys too short (min. 8 characters)\nNo account found. Create new by authorizing with new credentials.");
            }
        }
        else {
            readPasswords(user, password, socket);
        }
    });

    if (!fs.existsSync(passwordDataFile)) {
        socket.emit("new_account");
    }

    socket.on("addpassword", (website, username, password) => {
        var hash = crypto.createHash("RSA-SHA1").update(connectionUsername + ";" + connectionPassword + ";" + connectionUsername.split("").reverse().join("")).digest("hex");
        
        var lastData = passwordData;
        passwordData.push({"website":website,"username":username,"password":password});
        
        console.log(passwordData);
        stringifyData(passwordData, (error, res) => {
            if (error) {
                console.log(error.message);
                passwordData = lastData;
                socket.emit("passwords", hidePasswords(passwordData));
                socket.emit("message", "Data parsing failed: " + error.message);
            }
            else {
                console.log(res);
                fs.writeFile(passwordDataFile, encryptString(JSON.stringify({"user":connectionUsername,"password":connectionPassword,"data":res}), hash), (error) => {
                    if (error) {
                        console.log(error.message);
                        passwordData = lastData;
                        socket.emit("passwords", hidePasswords(passwordData));
                        socket.emit("message", "Saving failed: " + error.message);
                    }
                    else {
                        console.log("Saved successfully.");
                        socket.emit("passwords", hidePasswords(passwordData));
                    }
                });
            }
        });
    });

    socket.on("getpassword", (username, password, index, passwordId) => {
        readPasswords(username, password, socket, () => {
            console.log(passwordData[index]);
            socket.emit("gotpassword", passwordId, passwordData[index]["password"]);
        });
    });
});

function requestListener(req, res) {

    var file = req.url;

    if (file.startsWith("http://") || file.startsWith("https://")) {
        file = req.url.replace(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/g, "");
    }

    if (file.startsWith("/")) file = file.substr(1);
    if (file == "" || file == "/") file = "home.html";

    console.log(req.connection.remoteAddress + ": \"" + file + "\" (" + req.method + ")");
    
    if (!file.startsWith("error/")) {
        fs.readFile("web/" + file, function(err, f) {
    
            if (err) {
                resultError(res, 404, "File " + file + " doesn't exist");
                //if (path.extname(file) === ".html" || path.extname(file) === ".htm") {
                //    resultError(res, 404);
                //}
                //else {
                //}
            }
            else {
                res.writeHead(200, getHeader(file));
                res.write(f);
                res.end();
            }
    
        });
    }
    else {
        resultError(res, 403);
    }

}

function encryptString(input, salt) {
    var output = "";

    var inputCharacters = input.toString().split('');
    var saltCharacters = salt.toString().split('');
    var index = 0;

    inputCharacters.forEach(element => {
        var e = parseInt(element.charCodeAt(0)) + parseInt(saltCharacters[index % saltCharacters.length].charCodeAt(0)) + parseInt(saltCharacters.length);
        output += (String.fromCharCode(e)).toString();
        index++;
    });

    return output;
}
function decryptString(input, salt) {
    var output = "";

    var inputCharacters = input.toString().split('');
    var saltCharacters = salt.toString().split('');
    var index = 0;

    inputCharacters.forEach(element => {
        var e = parseInt(element.charCodeAt(0)) - parseInt(saltCharacters[index % saltCharacters.length].charCodeAt(0)) - parseInt(saltCharacters.length);
        output += (String.fromCharCode(e)).toString();
        index++;
    });

    return output;
}

function parseData(data, callback) {
    try {
        var output = [];
        var dataList = data.toString().substring(1, data.length - 2).split(",");
    
        for (var i = 0; i < data.length; i++) {
            if (data[i].trim() !== "") {
                output.push(JSON.parse(data[i]));
            }
        }
        
        callback(null, output);
    }
    catch(error) {
        callback(error, null);
    }
}
function stringifyData(data, callback) {
    var output = "[";
    
    for (var i = 0; i < data.length; i++) {
        output += JSON.stringify(data[i]);
        if (i < data.length - 1) {
            output += ",";
        }
    }
    
    output += "]";
    callback(null, output);
    try {
    }
    catch(error) {
        callback(error, null);
    }
}

function readPasswords(user, password, socket, callback = null) {
    var hash = crypto.createHash("RSA-SHA1").update(user + ";" + password + ";" + user.split("").reverse().join("")).digest("hex");
    
    fs.readFile(passwordDataFile, (err, buffer) => {
        if (err) {
            console.log(err.message);
            if (callback) {
                callback();
            }
            else {
                socket.emit("authorized", false, err.message);
            }
        }
        else {
            try {
                var decryptedData = decryptString(buffer, hash);
                var results = JSON.parse(decryptedData);
                
                var jsonResults = JSON.parse(results["data"]);

                if (results["user"] == user && results["password"] == password) {
                    connectionUsername = user;
                    connectionPassword = password;
                    passwordData =  jsonResults;
                    if (callback) {
                        callback();
                    }
                    else {
                        socket.emit("authorized", true, "Authentication successful");
                        socket.emit("passwords", hidePasswords(passwordData));
                    }
                }
                else {
                    if (callback) {
                        callback();
                    }
                    else {
                        socket.emit("authorized", false, "Authentication failed");
                    }
                }
            }
            catch (error) {
                console.log(error.message);
                if (callback) {
                    callback();
                }
                else {
                    socket.emit("authorized", false, "Loading data failed: " + error.message);
                }
            }
        }
    });
}

function hidePasswords(data) {
    var result = [];

    for (var i = 0; i < data.length; i++) {
        var resultData = data[i];
        resultData["password"] = "***";
        result.push(resultData);
    }

    return result;
}

// Return an error page to client
function resultError(res, code, message = "") {

    const file = "web/error/error.html";

    fs.readFile(file, function(err, buffer) {

        if (err) {

            const note = "Error template not found";

            console.log(note);

            res.writeHead(code, getHeader("errorresult.json"));

            // Set message to default message if empty
            if (message === undefined || message === null || message.trim() === "") {
                message = errors[code.toString()];
            }

            res.write(JSON.stringify({ "code": code, "message": message, "note": note }));
            res.end();
            
        }

        else {

            res.writeHead(code, getHeader(file));

            // Set message to default message if empty
            if (message === undefined || message === null || message.trim() === "") {
                message = errors[code.toString()];
            }

            // Set tag values
            res.write(buffer.toString()
                .replace(/&CODE/g, code)
                .replace(/&MESSAGE/g, message)
                .replace(/&NODE/g, nodeVersion)
                .replace(/&OS/g, serverOS)
                .replace(/&PORT/g, port));
            
            res.end();

        }

    });

}

// Get MIME type
function getMIMEType(ext) {

    if (ext.startsWith(".") == false)
        ext = path.extname(ext);

    var array = fs.readFileSync("data/mimes.dat").toString().split("\n");
    
    if (array.filter(option => option.startsWith(ext + "\t")).length == 0) {
        return "text/plain";
    }
    else {
        var result = (array.filter(option => option.startsWith(ext + "\t")))[0].split("\t")[1].trim();
        return result;
    }
}
// Get request header from file type
function getHeader(file) {
    var mime = getMIMEType(path.extname(file));
    var headers = {"Access-Control-Allow-Origin": "http://localhost",
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Max-Age": 2592000,
        "Content-Type": mime + "; charset=UTF-8",
    };

    if (mime == "text/html") {
        headers["Cache-Control"] = "max-age=0";
    }
    else {
        headers["Cache-Control"] = "max-age=86400";
    }

    return headers;
}
