let input=document.getElementById("buscador3");
let tabla=document.getElementById("tabla3");
let resultado="";
input.addEventListener("input", () => {
    let hijo;
    let nombre;
    resultado = input.value.toLowerCase();
    hijo=tabla.firstElementChild;
    while(hijo!=null){
        nombre=hijo.firstElementChild.nextElementSibling.textContent.toLowerCase();
        hijo.hidden=!nombre.includes(resultado);
        hijo=hijo.nextElementSibling;
    }
});