# Jules Arrière-Plan V5
Deux corrections majeures :
1. La caméra brute ne disparaît plus après environ une seconde. Le canvas traité ne devient visible qu'après réception d'un résultat valide de segmentation.
2. Les décors sont préchargés au clic avec `Image.onload`; le décor choisi est réellement utilisé dans le rendu, puis le sujet est redessiné au-dessus.

La caméra reste donc utilisable même si le détourage échoue. Tous les fichiers sont à la racine.
