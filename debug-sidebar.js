// Script de débogage pour vérifier la sidebar
console.log('🔍 Débogage de la sidebar - Planning de Saison');

// Vérifier si la section est dans les constantes
fetch('/constants.js')
  .then(response => response.text())
  .then(data => {
    if (data.includes('season-planning')) {
      console.log('✅ Section season-planning trouvée dans les constantes');
    } else {
      console.log('❌ Section season-planning NON trouvée dans les constantes');
    }
  })
  .catch(err => console.log('Erreur lors de la récupération des constantes:', err));

// Vérifier les éléments de la sidebar
setTimeout(() => {
  const sidebarItems = document.querySelectorAll('[data-section]');
  console.log('📋 Éléments de la sidebar trouvés:', sidebarItems.length);
  
  sidebarItems.forEach(item => {
    const sectionId = item.getAttribute('data-section');
    const text = item.textContent;
    console.log(`- ${sectionId}: ${text}`);
  });
  
  // Chercher spécifiquement la section Planning de Saison
  const planningSection = Array.from(sidebarItems).find(item => 
    item.textContent.includes('Planning de Saison') || 
    item.getAttribute('data-section') === 'season-planning'
  );
  
  if (planningSection) {
    console.log('✅ Section Planning de Saison trouvée dans la sidebar');
    console.log('Élément:', planningSection);
  } else {
    console.log('❌ Section Planning de Saison NON trouvée dans la sidebar');
  }
}, 2000);

// Vérifier l'état de l'application
setTimeout(() => {
  if (window.appState) {
    console.log('📊 État de l\'application:', window.appState);
  } else {
    console.log('❌ État de l\'application non disponible');
  }
}, 3000);
