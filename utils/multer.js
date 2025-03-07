import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directory = path.join(__dirname, "../public/temp/uploads");

const FILE_TYPE_MAP = {
    'image/pnp': 'png',
    'image/jpg': 'jpg',
    'image/jpeg:': 'jpeg'
}


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype]
        let uploadError = new Error("Invalid file format")
        if (isValid) {
            uploadError = null
        }
        cb(null, directory)
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-')
        const extension = FILE_TYPE_MAP[file.mimetype]
        cb(null, fileName + '-' + Date.now())
    }
})


const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }   
});

export default upload;
