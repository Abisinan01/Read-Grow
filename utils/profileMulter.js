import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profileDirectory = path.join(__dirname, "../public/profile_images");

// Ensure directory exists
if (!fs.existsSync(profileDirectory)) {
    fs.mkdirSync(profileDirectory, { recursive: true });
}

const FILE_TYPE_MAP = {
    "image/png": "png",
    "image/jpg": "jpg",
    "image/jpeg": "jpeg",
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        if (!isValid) {
            return cb(new Error("Invalid file format"), false);
        }
        cb(null, profileDirectory);
    },
    filename: function (req, file, cb) {
        const extension = FILE_TYPE_MAP[file.mimetype];
        const uniqueFileName = `${req.user?.id || "default"}-${Date.now()}.${extension}`;
        cb(null, uniqueFileName);
    },
});

const fileFilter = (req, file, cb) => {
    if (FILE_TYPE_MAP[file.mimetype]) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type"), false);
    }
};

const uploadProfileImage = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export default uploadProfileImage;
