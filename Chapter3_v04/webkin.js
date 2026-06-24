var parallax_ratio = 0.0002
var blur_ratio = 0.03;
// var parallax_ratio = -0.0


var focus_data = {
  "01B2":1,
  "02A":2,
  "03A":2,
  "04A":0.3,
  "05A":1,
  "011A":1,
  "012F":1.5,
  "013A":2,
  "014F":2,
  "15B2":1,
  "011D":1,
  "15A":0.4,
  "15F":0.4,
  "16A":0.5,
  "16D":0.5,
  "17F":1,
  "18F":0.3,
  "21A":1,
  "21A":3,
  "22B1":0.5,
  "22A":1,
  "23F":1,
  "24A":1.5,
}

function set_content_width(width){
  var main_content = document.getElementsByClassName("main-content")[0]
  var base_width = parseInt(getComputedStyle(main_content).getPropertyValue('width'));
  var window_width = window.innerWidth;

  var ratio = width/base_width-0.01;
  main_content.style.transform = `scale(${ratio})`;

  main_content.style.left = `${Math.floor((window_width-width)/2)}px`;
  return ratio
}

function get_focus(input) {
  for (const key in focus_data) {
    if (input.includes(key)) {
      return focus_data[key];
    }
  }

  return -1;
}

function on_scroll() {
  var W = window.innerWidth;
  var H = window.innerHeight;

  if (H > W || W < 800){
    var ratio = set_content_width(W)
  }
  else {
    var ratio = set_content_width(800)
  }

  var focus_pool = 0;
  var focus_stake = 0;
  var focus_intensity_pool = 0;

  document.querySelectorAll('.main-content > img').forEach(el => {
    const depth = parseFloat(getComputedStyle(el).getPropertyValue('z-index')) || 0;
    const height = parseFloat(getComputedStyle(el).getPropertyValue('height')) || 0;

    // Calculating the distance between the center of the image and 
    // the center of the screen. The height dependant terms are 
    // there to transition from top/top distance to center/center.

    var rel_pos = el.getBoundingClientRect().top - H/2 + height/2*ratio
    const parallaxOffset = rel_pos * depth  * parallax_ratio

    el.style.transform = `translateY(${parallaxOffset}px)`;

    // Distance from the center of the screen of either the 
    // top or lower border of the element

    var dist1 = Math.abs(rel_pos-ratio*height/2)
    var dist2 = Math.abs(rel_pos+ratio*height/2)
    var dist = Math.min(dist1, dist2)

    // If the center of the screen is between the two borders, 
    // dist should be 0

    if (rel_pos < ratio*height/2 && rel_pos > -ratio*height/2){
      dist = 0;
    }

    var focus_score = 1/(dist+1)
    var focus_intensity = get_focus(el.src)

    // if (el.src.includes("05A")){
    //   console.log("05A : ", focus_score, focus_intensity);
    // }

    // Contribute to a weighted mean of focus values determined by 
    // the focus score. The further an object is from the center 
    // of the screen, the less sway it has on the final focus value.

    if (focus_intensity >= 0) {
      focus_pool += depth*focus_score;
      focus_intensity_pool += focus_intensity*focus_score;
      focus_stake += focus_score;
    }

  });

  var focus = focus_pool/focus_stake;
  var focus_ratio = blur_ratio*focus_intensity_pool/focus_stake;
  console.log("Focus : ", focus, focus_ratio);

  // Apply the focus element-wise after the final focus value has been calculated.
  document.querySelectorAll('.main-content > img').forEach(el => {
    const depth = parseFloat(getComputedStyle(el).getPropertyValue('z-index')) || 0;
    var focus_intensity = get_focus(el.src)
    const blurAmount = Math.abs(depth-focus) * focus_ratio; 
    el.style.filter = `blur(${blurAmount}px)`;
  });
}

document.addEventListener('scroll', on_scroll);
document.addEventListener("load", on_scroll);
document.addEventListener("change", on_scroll);
window.addEventListener('resize', on_scroll);