var parallax_ratio = -0.0002
// var parallax_ratio = -0.0

function get_dof_data(){
  var dofcontrol = document.getElementById("dofcontrol")
  var elements = dofcontrol.children
  var data = [];

  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    data.push([parseInt(el.getAttribute("pos"), 10), parseInt(el.getAttribute("focus"), 10)])
  }

  return data;
}

function get_focus(scroll_pos) {
  // Array of [scroll position, focus] pairs
  var focus_index = get_dof_data();

  // If scroll_pos is less than the first point, return the first focus value
  if (scroll_pos <= focus_index[0][0]) {
    return focus_index[0][1];
  }

  // Iterate through focus_index to find the range for interpolation
  for (var i = 0; i < focus_index.length - 1; i++) {
    var [start_scroll, start_focus] = focus_index[i];
    var [end_scroll, end_focus] = focus_index[i + 1];

    // If scroll_pos is between two points, interpolate
    if (scroll_pos >= start_scroll && scroll_pos <= end_scroll) {
      var t = (scroll_pos - start_scroll) / (end_scroll - start_scroll); // Normalized position between points
      return start_focus + t * (end_focus - start_focus); // Linear interpolation
    }
  }

  // If scroll_pos is beyond the last point, return the last focus value
  return focus_index[focus_index.length - 1][1];
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

function on_scroll() {
  // const z_offset_ratio = 0.7;

  var W = window.innerWidth;
  var H = window.innerHeight;

  if (H > W || W < 800){
    var ratio = set_content_width(W)
  }
  else {
    var ratio = set_content_width(800)
  }
  // console.log("Ratio : ", ratio); 

  ref = document.getElementsByClassName("main-content")[0]
  var ref_pos = ref.getBoundingClientRect().top
  // console.log("Ref pos : '", ref_pos, "px'"); 
  // console.log("Ref pos : '", ref_pos*ratio, "px'"); 

  var scrollPosition = window.scrollY/ratio;
  var center_position = scrollPosition + H/2;
  // console.log("Scroll : ", scrollPosition); 

  var focus_pool = 0;
  var focus_stake = 0;

  document.querySelectorAll('.main-content > img').forEach(el => {
    const depth = parseFloat(getComputedStyle(el).getPropertyValue('z-index')) || 0;
    const height = parseFloat(getComputedStyle(el).getPropertyValue('height')) || 0;

    var rel_pos = el.getBoundingClientRect().top - H/2 + height/2*ratio
    const parallaxOffset = - rel_pos * depth  * parallax_ratio

    el.style.transform = `translateY(${parallaxOffset}px)`;
    
    var focus_score = 200/(Math.abs(rel_pos)+1)
    if (el.src.includes("05A")){
      console.log("05A : '", focus_score, "'");
    }

    if (el.classList.contains("focus")) {
      focus_pool += depth*focus_score;
      focus_stake += focus_score;
    }

  });

  var focus = focus_pool/focus_stake;
  console.log("Focus : ", focus); 

  document.querySelectorAll('.main-content > img').forEach(el => {
    const depth = parseFloat(getComputedStyle(el).getPropertyValue('z-index')) || 0;
    const blurAmount = Math.abs(depth-focus) * 0.03; 
    el.style.filter = `blur(${blurAmount}px)`;
  });
}

document.addEventListener('scroll', on_scroll);
document.addEventListener("load", on_scroll);
document.addEventListener("change", on_scroll);
window.addEventListener('resize', on_scroll);