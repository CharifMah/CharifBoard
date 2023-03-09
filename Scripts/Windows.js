function openWindow(elementId) {
    console.log("click");
    var myWindow = document.getElementById(elementId);
    myWindow.classList.add("show");
  }
  
  function closeWindow(elementId) {
    var myWindow = document.getElementById(elementId);
    myWindow.classList.remove("show");
  }