# The research behind Low-Battery Reader

Low-Battery Reader started as a personal tool: I have ADHD, and on some days dense papers are close to unreadable. This page summarizes what published research says about each feature, including the features that research does **not** support.

**Short version:** the evidence does not show that any single setting helps everyone. The best-supported idea is that *different readers need different formats*, and that the right format can make a real difference to speed and comprehension. That's why this tool is built around personal adjustment rather than one "accessible" default, and why the prototype collects anonymous settings data.

**On ADHD specifically:** most readability research studies dyslexia or general readers. ADHD-specific work is much thinner, so claims about ADHD here are made cautiously.

---

## Evidence at a glance

| Feature | What the research says | Strength |
|---|---|---|
| Reflowing the PDF into one clean column | Simplified "reader view" layouts sped up reading in a large online study | ✅ Supported |
| Personalizing font and format | The best font differs from person to person, and the gap between someone's best and worst fonts is large | ✅ Supported |
| Letter and word spacing | Extra spacing helps many readers with dyslexia, likely by reducing visual crowding | ✅ Supported (dyslexia) |
| Shorter line width | Short lines improved speed and, for some, comprehension in dyslexic readers | ✅ Supported (dyslexia) |
| Reading ruler / paragraph spotlight | Digital reading rulers improved reading speed, most for readers with dyslexia | ✅ Supported |
| One word at a time mode | Showing one word at a time in the same spot improved comprehension for students with ADHD (not for controls) | ✅ Supported (ADHD, one study) |
| Acronym hints | Acronyms in science have grown sharply and most are rarely reused, which hurts readability | 🟡 Indirect |
| Warm background colors (cream etc.) | Warm backgrounds outperformed cool ones on screen, for readers with and without dyslexia | 🟡 One large study |
| Dark mode | Dark-on-light text generally gives *better* performance than light-on-dark | ⚠️ Evidence against (kept as a comfort option) |
| Line color gradient | Mixed: helped some beginning readers with long, dense lines, hurt with already-easy layouts | ⚠️ Mixed |
| Dyslexia fonts (OpenDyslexic, Dyslexie) | No benefit to speed or accuracy in controlled studies | ❌ Not supported (kept for preference) |
| Bolding the start of words ("bionic reading") | No effect on reading speed in a controlled experiment and a 2,000-person test | ❌ Not supported (kept for preference) |
| Tinting b / d / p / q | Not tested in the studies I found | ❔ Untested |

---

## What the studies found

### Personalization is the strongest idea
A large crowdsourced study compared 16 fonts and found that readers were about 35% faster in their best font than in their worst, without losing comprehension, and **which** font was best depended on the person. Notably, people's *preferred* font did not reliably predict their *fastest* font [[13]](#ref13). This is the core reason the tool encourages experimenting, and why the feedback form records settings together with tiredness.

### Layout: reflow, spacing and line length
- **Reader view.** In an online study with 391 participants, a simplified reader-view layout increased reading speed by about 5% on average compared with standard web pages [[14]](#ref14). Reflowing a two-column PDF into a single clean column is the same idea.
- **Letter spacing.** In 74 Italian and French children with dyslexia, extra-large letter spacing roughly doubled reading accuracy and improved speed. The children with the most trouble identifying letters benefited most [[4]](#ref4). The proposed mechanism is *crowding*: nearby letters interfere with recognizing each one. A later study found the effect varies across individuals and conditions [[3]](#ref3).
- **Short lines.** An eye-tracking study of high-school students with dyslexia found that reading short lines on a small device increased speed by 27% and more than halved backward eye movements, with no cost to comprehension [[5]](#ref5). A follow-up with 103 students found the benefits concentrated in specific subgroups [[6]](#ref6).

### Focus aids: rulers and spotlight
Digital reading rulers (a bar, shade or highlight that follows the current line) were tested with 177 participants, about half with dyslexia. Several designs increased reading speed by roughly 10–20 words per minute compared with no ruler, with the largest gains for readers with dyslexia. No single design suited everyone [[12]](#ref12). The reading ruler and paragraph spotlight in this tool follow the same principle.

### ADHD-specific findings
- **Eye movements matter in ADHD reading.** A 2025 study compared normal reading with showing one word at a time in the centre of the screen (RSVP). Undergraduates with ADHD understood the text *better* in the RSVP mode, while controls did not [[15]](#ref15). This suggests that the effort of moving the eyes across dense text contributes to comprehension problems in ADHD. The **one word at a time** mode is built on this finding. Note that it's a single study, and speed and comprehension trade off: the mode pauses longer at punctuation and long words, and shows the whole sentence when paused so you can re-orient.
- **Attention interacts with layout.** In adolescents with and without ADHD, comprehension tracked sustained attention, and the effect of double spacing and screen vs. paper depended on each reader's attention level [[16]](#ref16).
- **Screens can be harder.** Higher-education students with ADHD had more trouble understanding digitally displayed text than their peers, a gap that was not seen with print [[17]](#ref17). Tools that make on-screen reading calmer and more structured target exactly this gap.

### Color and background
- **Warm backgrounds.** A study of 341 people (89 with dyslexia) tested ten background colors with black text. Warm colors like peach, orange and yellow improved reading performance over cool colors, similarly for both groups [[10]](#ref10).
- **Dark mode: honest caveat.** Dark text on a light background generally yields better reading performance than light text on dark, likely because brighter screens make pupils smaller and vision sharper [[11]](#ref11). The website defaults to dark because many people find it more comfortable, especially in low light or with fatigue. If you're reading for accuracy, try a light or cream background.
- **Line color gradients.** An independent study with 6–9 year olds found the gradient helped second-graders with long, tightly spaced lines, but *slowed* them on layouts already optimized for their level, and third-graders rated gradient text as harder to read [[9]](#ref9). The authors stress that reading apps' claims should be formally tested. Most positive reports for gradients come from studies commissioned by the gradient's developer.

### What doesn't hold up (but stays as an option)
- **Dyslexia fonts.** In 170 Dutch children with dyslexia, the Dyslexie font did not improve speed or accuracy over Arial, and most children preferred Arial [[1]](#ref1). OpenDyslexic likewise showed no improvement over Arial or Times New Roman [[2]](#ref2). Where benefits appeared, they came from the extra *spacing*, not the letter shapes [[3]](#ref3).
- **Bolding the start of words.** A controlled experiment with 100 paragraphs found no difference in reading time between "Bionic" and normal text [[7]](#ref7). An informal online test with over 2,000 readers found the same: no speed or comprehension benefit [[8]](#ref8).

These features remain in the tool because comfort and willingness to keep reading matter too, especially on low-energy days, and because individual responses vary [[13]](#ref13). But they shouldn't be presented as proven aids.

### Why acronym hints
An analysis of over 24 million titles and 18 million abstracts found that out of more than a million unique acronyms, only about 0.2% were used regularly and 79% appeared fewer than 10 times [[18]](#ref18). Most acronyms a reader meets are effectively one-off jargon, which is why the tool resolves them where they're defined.

---

## What this means for the project
1. **Personalization over prescriptions.** No setting is a cure. The presets are starting points, and the feedback data is meant to tune them from real readers.
2. **Be honest about evidence.** Settings with no measured benefit are kept as comfort options and labelled as such here.
3. **Built from research:** the one-word-at-a-time mode follows [[15]](#ref15). Next: comparing readers' chosen settings (including word speed) with how tired they report being.

---

## References

<a id="ref1"></a>1. Kuster, S. M., van Weerdenburg, M., Gompel, M., & Bosman, A. M. T. (2018). Dyslexie font does not benefit reading in children with or without dyslexia. *Annals of Dyslexia*, 68, 25–42. https://doi.org/10.1007/s11881-017-0154-6

<a id="ref2"></a>2. Wery, J. J., & Diliberto, J. A. (2017). The effect of a specialized dyslexia font, OpenDyslexic, on reading rate and accuracy. *Annals of Dyslexia*, 67, 114–127. https://doi.org/10.1007/s11881-016-0127-1

<a id="ref3"></a>3. Galliussi, J., Perondi, L., Chia, G., et al. (2020). Inter-letter spacing, inter-word spacing, and font with dyslexia-friendly features: testing text readability in people with and without dyslexia. *Annals of Dyslexia*, 70, 141–152. https://pmc.ncbi.nlm.nih.gov/articles/PMC7188700

<a id="ref4"></a>4. Zorzi, M., Barbiero, C., Facoetti, A., et al. (2012). Extra-large letter spacing improves reading in dyslexia. *PNAS*, 109(28), 11455–11459. https://doi.org/10.1073/pnas.1205566109

<a id="ref5"></a>5. Schneps, M. H., Thomson, J. M., Sonnert, G., Pomplun, M., Chen, C., & Heffner-Wong, A. (2013). Shorter lines facilitate reading in those who struggle. *PLoS ONE*, 8(8), e71161. https://doi.org/10.1371/journal.pone.0071161

<a id="ref6"></a>6. Schneps, M. H., Thomson, J. M., Chen, C., Sonnert, G., & Pomplun, M. (2013). E-readers are more effective than paper for some with dyslexia. *PLoS ONE*, 8(9), e75634. https://doi.org/10.1371/journal.pone.0075634

<a id="ref7"></a>7. Snell, J. (2024). No, Bionic Reading does not work. *Acta Psychologica*, 247, 104304. https://doi.org/10.1016/j.actpsy.2024.104304

<a id="ref8"></a>8. Readwise (2022). Does Bionic Reading actually work? We timed over 2,000 readers. (Informal, not peer-reviewed.) https://blog.readwise.io/bionic-reading-results/

<a id="ref9"></a>9. Koornneef, A., & Kraal, A. (2022). Does BeeLine Reader's gradient-coloured font improve the readability of digital texts for beginning readers? *Computers in Human Behavior Reports*, 6, 100197. https://www.sciencedirect.com/science/article/pii/S2451958822000318

<a id="ref10"></a>10. Rello, L., & Bigham, J. P. (2017). Good background colors for readers: A study of people with and without dyslexia. *Proceedings of ACM ASSETS '17*, 72–80. https://doi.org/10.1145/3132525.3132546

<a id="ref11"></a>11. Piepenbrock, C., Mayr, S., & Buchner, A. (2014). Smaller pupil size and better proofreading performance with positive than with negative polarity displays. *Ergonomics*. https://doi.org/10.1080/00140139.2014.948496

<a id="ref12"></a>12. Niklaus, A. G., Cai, T., Bylinskii, Z., & Wallace, S. (2023). Digital reading rulers: Evaluating inclusively designed rulers for readers with dyslexia and without. *Proceedings of CHI '23*. https://doi.org/10.1145/3544548.3581367

<a id="ref13"></a>13. Wallace, S., Bylinskii, Z., Dobres, J., et al. (2022). Towards individuated reading experiences: Different fonts increase reading speed for different individuals. *ACM Transactions on Computer-Human Interaction*, 29(4), Article 38. https://doi.org/10.1145/3502222

<a id="ref14"></a>14. Li, Q., et al. (2019). The impact of web browser reader views on reading speed and user experience. *Proceedings of CHI 2019*. https://doi.org/10.1145/3290605.3300754

<a id="ref15"></a>15. Moussaoui, S., Siddiqi, A. A., Cheung, T. C. K., & Niemeier, M. (2025). Reading without eye movements: Improving reading comprehension in young adults with attention-deficit/hyperactivity disorder (ADHD). *Journal of the International Neuropsychological Society*. https://doi.org/10.1017/S1355617725101628

<a id="ref16"></a>16. Stern, P., & Shalev, L. (2013). The role of sustained attention and display medium in reading comprehension among adolescents with ADHD and without it. *Research in Developmental Disabilities*. https://doi.org/10.1016/j.ridd.2012.08.021

<a id="ref17"></a>17. Ben-Yehudah, G., et al. (2019). Pay attention to digital text: The impact of the media on text comprehension and self-monitoring in higher-education students with ADHD. *Research in Developmental Disabilities*.

<a id="ref18"></a>18. Barnett, A., & Doubleday, Z. (2020). The growth of acronyms in the scientific literature. *eLife*, 9, e60080. https://doi.org/10.7554/eLife.60080

---
*Last reviewed: November 2026. Corrections and additional studies are welcome via GitHub issues.*
