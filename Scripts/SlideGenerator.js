// Obtient une référence à l'élément div conteneur
const slider = document.querySelector('.slider');
// Spécifie le chemin du dossier contenant les images
const imagePath = 'Images/ProjetSin/';

// Spécifie le nombre d'images à générer
const numImages = slider.dataset.count;

for (let i = 1; i <= numImages; i++) {
    // Crée un nouvel élément a avec un ID unique
    const a = document.createElement('a');
    a.href = '#slide-' + i;
    a.text = i;
    slider.appendChild(a);
}

// Crée un nouvel élément div avec un ID unique
const divSlides = document.createElement('div');
divSlides.className = "slides";
slider.appendChild(divSlides);

// Boucle pour générer les éléments div avec les images
for (let i = 1; i <= numImages; i++) {

    // Crée un nouvel élément div avec un ID unique
    const div = document.createElement('div');
    div.id = 'slide-' + i;

    // Crée un nouvel élément img avec l'attribut src correspondant à l'image
    const img = document.createElement('img');
    img.src = imagePath + i + '.png';
    img.alt = 'Image ' + i;

    // Ajoute l'élément img à l'élément div
    div.appendChild(img);

    // Ajoute l'élément div au slides
    divSlides.appendChild(div);
}
