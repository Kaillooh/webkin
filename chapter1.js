var parallax_ratio = -0.0006
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
}

function on_scroll() {
  const z_offset_ratio = 0.7;
  
  var width = window.innerWidth;
  var height = window.innerHeight;
  if (height > width || width < 800){
    set_content_width(width)
  }
  else {
    set_content_width(800)
  }
  
  var scrollPosition = window.scrollY;
  // scrollPosition += height/2;

  document.querySelectorAll('.main-content > img').forEach(el => {
    const depth = parseFloat(getComputedStyle(el).getPropertyValue('z-index')) || 0;
    const originalTop = parseFloat(el.style.top) || 0; 
    const parallaxOffset = (scrollPosition - originalTop) * depth  * parallax_ratio + z_offset_ratio * depth; 

    el.style.transform = `translateY(${parallaxOffset}px)`;

    var center_position = scrollPosition + height/2;
    var focus = get_focus(center_position);
    console.log("Focus for ", center_position, " : ", focus);
    const blurAmount = Math.abs(depth-focus) * 0.0185; 
    el.style.filter = `blur(${blurAmount}px)`;
  });
}

document.addEventListener('scroll', on_scroll);
document.addEventListener("load", on_scroll);
document.addEventListener("change", on_scroll);
window.addEventListener('resize', on_scroll);