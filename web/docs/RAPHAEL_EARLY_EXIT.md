# Raphael : empêcher la sortie native anticipée

Le joueur signale une sortie à la carte avec les deux héros intacts. L’interprétation précédente des traces comme double mort n’était pas justifiée : la commande native1E2B=1 place aussi le héros dans l’état11, avec l’animation DK_Victory63. Les dégâts et cette victoire doivent être distingués.

## Correction

Le verrou historique ne retenait que la banane74 à l’état0 et la validation du gardien effaçait un combat vivant dès que cet état avançait. Désormais :

- le mode1 conserve la compatibilité des anciennes victoires natives sans gardien ;
- le mode2 bloque tous les états de la banane tant qu’un combat ajouté existe et n’est pas released, y compris toute sa défaite animée ;
- la fonction nativeBF8778 de consommation de commande conserve la demande de victoire1 en attente dans ce mode ; la commande d’échec2 et les autres commandes restent natives ;
- le crochet à BF8778 remplace exactement5 octets : le RTS à BF877D est préservé ; les retours restent dans la banque BF ;
- un gardien connu n’est plus effacé parce que la banane passe à un état supérieur ; l’acteur doit réellement avoir disparu ou la salle avoir changé ;
- à la reprise, la propriété du combat et le mode2 sont restaurés avant les premières frames natives ;
- on ne présente plus le seul état11 comme « Duo defeated » ; les diagnostics conservent80 changements d’état avec commande, animation, dégâts, banane et PV du gardien.

Les clés et formats de sauvegarde ne changent pas. Aucune progression ni vie native n’est fabriquée. Une ancienne sauvegarde ayant déjà avancé jusqu’à une cérémonie native irréversible peut encore nécessiter le retour au dernier checkpoint de carte ; ne pas promettre de reconstruire rétroactivement toutes ses phases.

## Vérification

747 tests /66 fichiers, dont exécution des octets65816 émis avec contrôle des registres/pile et des sites de retour natifs, états0..3 de banane, absence de blocage des commandes d’échec, maintien des PV après changement d’état de banane. Build TypeScript/Vite.

La recette DEV privée expose « Request early native victory ». Elle soumet1E2B=1 et banane1 pendant un Raphael encore à6PV, sans toucher aux héros. Le bouton final DEV permet ensuite de jouer toute sa défaite et vérifier la libération de la carte. Ce scénario contrôle le chemin de sortie ; il n’identifie pas à lui seul l’action exacte qui déclenchait la commande sur le téléphone du joueur. Recette iPhone/Android physiques et campagne complète toujours à faire.

Recette native exécutée : commande1 + banane1 restent en attente avec Raphael6PV, héros contrôlable, visée et tir normaux. Au dernier impact DEV, la commande reste en attente pendant939 frames de défaite ; elle n’est consommée qu’à phase released, animation native63, puis banane2 et3 et véritable retour à la carte. Les frames de preuve sont3630 (dying),4569 (released/victoire),5053 (carte).
