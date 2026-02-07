# ACL-2025-LesPilliers

Lien du Discord d'organisation : https://discord.gg/GsaSSkyp

Projet Agenda ACL 2025, équipe Les Pilliers

Objectif : Faire une application web d'un agenda collaboratif.
On peut placer des évènements, des rendez vous, les modifier, les supprimer, modifier dynamiquement la durée de l'évènement.
On peut créer un compte, se connecter.
Les mots de passes sont chiffrés dans une base de donnée MongoDB.
On peut partager un agenda


Pour build :

se placer dans src

npm install

lancer la base de donnée mongodb (généralement avec "mongod" )
(vérifier que cela marche bien avec mongosh)

npm run build:css

npm run start

localhost:3000
