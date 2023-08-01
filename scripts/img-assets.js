hexo.extend.filter.register("before_post_render", function (data) {
  try {
    if (!data.source.startsWith("_posts/")) {
      return;
    }
    let filename = data.source.split("/")[1].split(".")[0];
    let reg = new RegExp("!\\[(.*?)\\]\\(" + filename + "/(.+?)\\)", "g");
    data.content = data.content.replace(reg, "{% asset_img $2 $1 %}", "g");
  } catch (error) {
    console.log("img-assets.js error: ", error);
  }
  return data;
});
