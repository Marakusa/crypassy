const { Server } = require("socket.io");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require('os');
const formidable = require('formidable');
const csv = require('csv-parse');
const zxcvbn = require('zxcvbn');

const passwordDataFile = "data/local.pmd";
var passwordData = [];
var connectionUsername = "";
var connectionPassword = "";

const port = 8800;
const errors = JSON.parse(fs.readFileSync("json/errors.json"));

const nodeVersion = process.version.substring(1);
const serverOS = os.type() + " " + os.release();

/*// Set SSL keys
var serverOptions =  {
    key: fs.readFileSync("ssl/key.pem"),
    cert: fs.readFileSync("ssl/certificate.pem")
};*/

// Show app version
const version = "v0.2.0-alpha";
console.log("Starting Crypassy " + version);

// Start HTTP server and socket.io
server = http.createServer({}, requestListener);
server.listen(port);
console.log("Server started at http://127.0.0.1:" + port);

const io = new Server(server);

var clientSocket;

// On socket.io client connected
io.on("connection", (socket) => {
    clientSocket = socket;
    
    console.log("User connected");

    // User disconnected
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

    socket.on("authorize", (user, password) => {
        authorizeClient(user, password, socket);
    });
    
    socket.on("addpassword", (website, username, password) => {
        if (website !== "" && username !== "" && password !== "") {
            var hash = crypto.createHash("sha512").update(connectionUsername + ";" + connectionPassword + ";" + connectionUsername.split("").reverse().join("")).digest("hex");
            
            var lastData = passwordData;
            passwordData.push({"website":website,"username":username,"password":password});
            
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
        }
        else {
            socket.emit("message", "Please insert all variables before saving.");
        }
    });

    socket.on("getpassword", (username, password, index, passwordId) => {
        readPasswords(username, password, socket, () => {
            socket.emit("gotpassword", passwordId, passwordData[index]["password"]);
        });
    });

    socket.on("removepassword", (username, password, index) => {
        readPasswords(username, password, socket, () => {
            var newList = [];
            
            var i = 0;
            passwordData.forEach(element => {
                if (index !== i) {
                    newList.push(element);
                }
                i++;
            });
    
            passwordData = newList;
            
            var hash = crypto.createHash("sha512").update(connectionUsername + ";" + connectionPassword + ";" + connectionUsername.split("").reverse().join("")).digest("hex");
            
            stringifyData(passwordData, (error, res) => {
                if (error) {
                    console.log(error.message);
                    socket.emit("passwords", hidePasswords(passwordData));
                    socket.emit("message", "Data parsing failed: " + error.message);
                }
                else {
                    fs.writeFile(passwordDataFile, encryptString(JSON.stringify({"user":connectionUsername,"password":connectionPassword,"data":res}), hash), (error) => {
                        if (error) {
                            console.log(error.message);
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
    });

    socket.on("checkpassword", (password) => {
        var check = zxcvbn(password);

        var strengthColor = "grey";
        var checkTime = check.crack_times_seconds["offline_fast_hashing_1e10_per_second"];

        if (check.checkTime >= 315576000) strengthColor = "green";
        else if (checkTime >= 31557600) strengthColor = "lime";
        else if (checkTime >= 18408600) strengthColor = "yellow";
        else if (checkTime >= 5259600) strengthColor = "tomato";
        else strengthColor = "grey";

        socket.emit("checkedpassword", "Fast offline (<span style=\"color: " + strengthColor + "\">" + check.crack_times_display["offline_fast_hashing_1e10_per_second"] + "</span>)");
    });

    socket.on("copypassword", (username, password, index, passwordId) => {
        readPasswords(username, password, socket, () => {
            socket.emit("copypassword", passwordId, passwordData[index]["password"]);
        });
    });
});

function authorizeClient(user, password, socket) {
    if (!fs.existsSync(passwordDataFile)) {
        if (user.length >= 8, password.length >= 8) {
            var hash = crypto.createHash("sha512").update(user + ";" + password + ";" + user.split("").reverse().join("")).digest("hex");
            
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
}

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
            }
            else {
                if (req.method == "POST") {
                    var form = new formidable.IncomingForm();
                    form.parse(req, function (err, fields, files) {
                        if (err) {
                            resultError(res, 500, "File upload failed: " + err.message);
                        }
                        else {
                            fs.readFile(files["fileInput"].path, (err, data) => {
                                if (err) {
                                    resultError(res, 500, "File read failed: " + err.message);
                                }
                                else {
                                    try {
                                        fs.rmSync(files["fileInput"].path);
                                    }
                                    catch (e) {
                                        log.error(e);
                                    }

                                    csv(data.toString(), {columns: true, trim: true}, (err, records) => {
                                        if (err) {
                                            resultError(res, 500, "File read failed: " + err.message);
                                        }
                                        else {
                                            records.forEach(element => {
                                                passwordData.push({
                                                    "website": element["url"],
                                                    "username": element["username"],
                                                    "password": element["password"]
                                                });
                                            });

                                            var hash = crypto.createHash("sha512").update(connectionUsername + ";" + connectionPassword + ";" + connectionUsername.split("").reverse().join("")).digest("hex");
    
                                            stringifyData(passwordData, (err, wres) => {
                                                if (err) {
                                                    resultError(res, 500, "Passwords parse failed: " + err.message);
                                                }
                                                else {
                                                    fs.writeFile(passwordDataFile, encryptString(JSON.stringify({"user":connectionUsername,"password":connectionPassword,"data":wres}), hash), (err) => {
                                                        if (err) {
                                                            resultError(res, 500, "Passwords save failed: " + err.message);
                                                        }
                                                        else {
                                                            res.writeHead(200, getHeader(file));
                                                            res.write(f.toString().replace(/&V/g, version));
                                                            res.end();
                                                            authorizeClient(connectionUsername, connectionPassword, clientSocket);
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
                else {
                    res.writeHead(200, getHeader(file));
                    res.write(f.toString().replace(/&V/g, version));
                    res.end();
                }
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
    var hash = crypto.createHash("sha512").update(user + ";" + password + ";" + user.split("").reverse().join("")).digest("hex");
    
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
                    passwordData = jsonResults;
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
                    socket.emit("authorized", false, "Loading data failed (most likely wrong password and/or username): " + error.message);
                }
            }
        }
    });
}

function hidePasswords(data) {
    var result = [];

    for (var i = 0; i < data.length; i++) {
        var resultData = {
            "website": data[i]["website"],
            "username": data[i]["username"],
            "password": "***"
        };
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
