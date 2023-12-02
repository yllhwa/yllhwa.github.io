// 打包 public 目录下的文件到 public/public.zip
const fs = require("fs");
const archiver = require("archiver");
const output = fs.createWriteStream("tmp.zip");
const archive = archiver("zip", {
  zlib: { level: 9 },
});
output.on("close", function () {
  // 移动 tmp.zip 到 public 目录下
  const path = require("path");
  const tmpPath = path.join(__dirname, "tmp.zip");
  const publicPath = path.join(__dirname, "public/public.zip");
  fs.renameSync(tmpPath, publicPath);
});
archive.on("error", function (err) {
  throw err;
});
archive.pipe(output);
archive.directory("public/", false);
archive.finalize();
