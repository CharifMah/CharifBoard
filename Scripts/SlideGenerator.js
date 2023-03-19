
function GenerateSlides()
{
    const slider = document.querySelectorAll('.slider');

    for (let i = 0; i <= slider.length - 1; i++)
    {
        // Spécifie le chemin du dossier contenant les images
        const imagePath = 'Images/' + slider[i].dataset.folderpath + '/';

        // Spécifie le nombre d'images à générer
        const numImages = slider[i].dataset.count;

        GenerateButton(numImages,i,slider)

        GenerateImage(numImages,i,slider,imagePath)
    }
}

function GenerateButton(numImages,i,slider)
{
    for (let index = 1; index <= numImages; index++) {
        // Crée un nouvel élément a avec un ID unique
        const a = document.createElement('a');
        a.href = '#slide-' + i + '-' + index;
        a.text = index;
        slider[i].appendChild(a);
    }
}

function GenerateImage(numImages,i,slider,imagePath)
{
    const divSlides = document.createElement('div');
    divSlides.className = "slides";

   // Boucle pour générer les éléments div avec les images
    for (let index = 1; index <= numImages; index++) {

        // Crée un nouvel élément div avec un ID unique
        const div = document.createElement('div');
        div.id = 'slide-' + i + '-' + index;

        // Crée un nouvel élément img avec l'attribut src correspondant à l'image
        const img = document.createElement('img');
        img.src = imagePath + index + '.png';
        img.alt = 'Image ' + index;

        // Ajoute l'élément img à l'élément div
        div.appendChild(img);

        // Ajoute l'élément div au slides
        divSlides.appendChild(div);
    }

    slider[i].appendChild(divSlides);
}

GenerateSlides();