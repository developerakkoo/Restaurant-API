const path = require("path");
const fs = require("fs");

const deleteFile = (filePath) => {
    // console.log("DeleteIMG");
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, (err) => console.log(err));
};
module.exports = {
    deleteFile,
};
