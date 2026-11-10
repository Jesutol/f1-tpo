const fragmento=document.createDocumentFragment();
let input1=document.getElementById("buscador1");
let input2=document.getElementById("buscador2");
let tabla1=document.getElementById("tabla1");
let tabla2=document.getElementById("tabla2");
console.log("hola");
let resultado="";
input1.addEventListener("input", () => {
    let hijo;
    let nombre;
    resultado = input1.value.toLowerCase();
    hijo=tabla1.firstElementChild;
    while(hijo!=null){
        nombre=hijo.firstElementChild.nextElementSibling.textContent.toLowerCase();
        hijo.hidden=!nombre.includes(resultado);
        hijo=hijo.nextElementSibling;
    }
});
input2.addEventListener("input", () => {
    let hijo;
    let nombre;
    resultado = input2.value.toLowerCase();
    hijo=tabla2.firstElementChild;
    while(hijo!=null){
        nombre=hijo.firstElementChild.nextElementSibling.textContent.toLowerCase();
        hijo.hidden=!nombre.includes(resultado);
        hijo=hijo.nextElementSibling;
    }
});
