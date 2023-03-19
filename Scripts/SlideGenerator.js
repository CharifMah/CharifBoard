
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
        if (slider[i].dataset.folderpath != "AfterEffect-SonyVegas")
            GenerateImage(numImages,i,slider,imagePath);
        else
            GenerateVideo(numImages,i,slider,imagePath)
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

function GenerateVideo(numVideos, i, slider, videoPath) {
    // Crée un nouvel élément div pour les diapositives
    const divSlides = document.createElement('div');
    divSlides.className = "slides";

    // Boucle pour générer les éléments div avec les vidéos
    for (let index = 1; index <= numVideos; index++) {

        // Crée un nouvel élément div avec un ID unique
        const div = document.createElement('div');
        div.id = 'slide-' + i + '-' + index;

        // Crée un nouvel élément video avec l'attribut src correspondant à la vidéo
        const video = document.createElement('video');
        video.src = videoPath + index + '.mp4';
        video.alt = 'Vidéo ' + index;

        // Ajoute des sources vidéo pour chaque élément "video"
        const source1 = document.createElement('source');
        source1.src = videoPath + index + '.mp4';
        source1.type = 'video/mp4';
        video.appendChild(source1);

        const source2 = document.createElement('source');
        source2.src = videoPath + index + '.webm';
        source2.type = 'video/webm';
        video.appendChild(source2);

        // Ajoute l'attribut "controls" pour permettre à l'utilisateur de contrôler la lecture de la vidéo
        video.setAttribute("controls", "");

        // Ajoute l'élément "video" à l'élément "div"
        div.appendChild(video);

        // Ajoute l'élément "div" au slides
        divSlides.appendChild(div);
    }

    // Ajoute l'ensemble des diapositives générées à votre élément "slider"
    slider[i].appendChild(divSlides);
}

GenerateSlides();