let input=document.getElementById("buscador3");
let tabla=document.getElementById("tabla3");
let resultado="";
input.addEventListener("input", () => {
    let hijo;
    let nombre;
    let nombreMarca;
    resultado = input.value.toLowerCase();
    hijo=tabla.firstElementChild;
    while(hijo!=null){
        nombre=hijo.firstElementChild.nextElementSibling.textContent.toLowerCase();
        nombreMarca=hijo.firstElementChild.nextElementSibling.nextElementSibling.textContent.toLowerCase();
        hijo.hidden=!nombre.includes(resultado) && !nombreMarca.includes(resultado);
        hijo=hijo.nextElementSibling;
    }
});