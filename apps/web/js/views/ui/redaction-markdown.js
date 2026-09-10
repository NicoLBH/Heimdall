/**
 * Un texte en Markdown, avec ses onglets, sa barre et son aperçu — **une fois**.
 *
 * ## Pourquoi ce fichier existe
 *
 * L'application demande un texte rédigé à quatre endroits au moins : la
 * description d'un sujet, un commentaire, un champ de notice
 * (`ui/champ-redige.js`), et maintenant la description d'une proposition. Les
 * briques étaient déjà partagées — `ui/comment-composer.js` pour la boîte,
 * `ui/subject-rich-editor.js` pour la barre, `utils/markdown-composer.js` pour
 * ce qu'un bouton fait au texte, `utils/markdown-renderer.js` pour l'aperçu —,
 * mais **le câblage** ne l'était pas : chaque écran réécrivait le basculement
 * Écrire/Aperçu et l'application du gras.
 *
 * Trois câblages, trois gras au bout de six mois. Ce fichier tient le câblage.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne garde pas l'état. L'écran sait ce qu'il redessine et quand ; ici on rend
 * du HTML et on signale des intentions. C'est la même règle que
 * `ui/champ-redige.js`, dont ce fichier est le petit frère sans les cases à
 * cocher.
 */

import { renderCommentComposer } from "./comment-composer.js";
import { renderSubjectMarkdownToolbar } from "./subject-rich-editor.js";
import { applyMarkdownComposerAction } from "../../utils/markdown-composer.js";
// Le rendu de base, sans la résolution des « #58 » : celle-ci vit avec les
// sujets, et l'importer d'ici tirerait tout l'écran des sujets dans une fenêtre
// qui affiche quatre lignes.
import { renderMarkdownToHtml } from "../../utils/markdown-renderer.js";
import { svgIcon } from "../../ui/icons.js";

/**
 * Les boutons d'une rédaction courte.
 *
 * Ni mention ni référence de sujet : une description de proposition n'a personne
 * à interpeller, et offrir un geste qui ne mène nulle part se paie en confiance.
 */
const BOUTONS = ["heading", "bold", "italic", "quote", "code", "link",
  "ordered-list", "bullet-list", "checklist"];

/**
 * Le champ, en HTML.
 *
 * @param {object} options
 * @param {string} options.cle ce qui identifie le champ d'un rendu à l'autre
 * @param {string} [options.texte] ce qu'il porte
 * @param {boolean} [options.apercu] l'onglet « Aperçu » est-il actif
 * @param {string} [options.placeholder]
 */
export function dessinerRedaction({ cle, texte = "", apercu = false, placeholder = "" } = {}) {
  const nom = String(cle ?? "");
  const dit = String(texte ?? "");

  return renderCommentComposer({
    hideAvatar: true, hideTitle: true, hideActions: true,
    previewMode: apercu,
    // L'aperçu se calcule au rendu, avec le même moteur que partout : deux
    // rendus Markdown donneraient deux mises en page du même texte (règle 4).
    previewHtml: dit.trim() ? renderMarkdownToHtml(dit, { preserveMessageLineBreaks: true }) : "",
    previewEmptyHint: "Rien à prévisualiser",
    composerClassName: "redaction-markdown__composeur",
    textareaId: `redaction-${nom}`,
    previewId: `redaction-apercu-${nom}`,
    textareaValue: dit,
    placeholder,
    tabWriteAction: `redaction-ecrire:${nom}`,
    tabPreviewAction: `redaction-apercu:${nom}`,
    textareaAttributes: { "data-redaction-texte": nom },
    toolbarHtml: renderSubjectMarkdownToolbar({
      buttonAction: "redaction-format", svgIcon, boutons: BOUTONS,
      pieceJointe: false, dispositionGroupee: true,
      extraData: { redactionCle: nom }
    })
  });
}

/**
 * Les gestes du champ.
 *
 * La mise en forme s'applique **ici**, pas chez l'appelant : c'est le même geste
 * partout, et le faire réécrire à chaque écran finirait par donner deux gras
 * différents dans la même application.
 *
 * @param {Element} root où chercher le champ
 * @param {object} rappels
 * @param {Function} [rappels.onTexte] `(cle, texte)` — à la frappe
 * @param {Function} [rappels.onOnglet] `(cle, apercu)` — à la bascule
 */
export function brancherRedaction(root, { onTexte, onOnglet } = {}) {
  if (!root) return;

  root.addEventListener("click", (evenement) => {
    const format = evenement.target.closest('[data-action="redaction-format"]');
    if (format) {
      const cle = format.dataset.redactionCle;
      const zone = Array.from(root.querySelectorAll("[data-redaction-texte]"))
        .find((el) => el.dataset.redactionTexte === cle);
      if (zone && applyMarkdownComposerAction(zone, format.dataset.format)) {
        onTexte?.(cle, zone.value);
        zone.focus();
      }
      return;
    }

    const onglet = evenement.target.closest('[data-action^="redaction-ecrire:"], [data-action^="redaction-apercu:"]');
    if (!onglet) return;
    const [quoi, quelle] = String(onglet.dataset.action).split(":");
    // Ce qui est tapé se garde **avant** de basculer : l'aperçu redessine le
    // champ, et un texte non repris serait celui du rendu précédent.
    const zone = Array.from(root.querySelectorAll("[data-redaction-texte]"))
      .find((el) => el.dataset.redactionTexte === quelle);
    if (zone) onTexte?.(quelle, zone.value);
    onOnglet?.(quelle, quoi === "redaction-apercu");
  });

  root.addEventListener("input", (evenement) => {
    const zone = evenement.target.closest("[data-redaction-texte]");
    if (zone) onTexte?.(zone.dataset.redactionTexte, zone.value);
  });
}
