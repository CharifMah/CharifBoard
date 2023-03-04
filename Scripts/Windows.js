function openWindow() {
    console.log("click");
    var myWindow = document.getElementById("myWindow");
    myWindow.classList.add("show");
  }
  
  function closeWindow() {
    var myWindow = document.getElementById("myWindow");
    myWindow.classList.remove("show");
  }