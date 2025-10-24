/**
 * Test pour vérifier le tri chronologique dans les sections dashboard
 */

// Simulation des données d'événements de test (même que dans l'image)
const testEvents = [
  {
    id: '1',
    name: 'Plages Vendéenne',
    date: '2026-02-21',
    location: 'Saint-Urbain'
  },
  {
    id: '2', 
    name: 'Classique Féminine Vienne Nouvelle-Aquitaine',
    date: '2026-06-21',
    location: 'Civeaux'
  },
  {
    id: '3',
    name: 'Tour d\'Ambert Livradois Forez',
    date: '2026-05-09',
    location: 'Ambert'
  }
];

// Test MyDashboardSection (logique corrigée)
console.log('🔍 Test MyDashboardSection:');
const myDashboardEvents = testEvents
  .filter(event => new Date(event.date) > new Date())
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(0, 2);

console.log('Événements triés:');
myDashboardEvents.forEach((event, index) => {
  console.log(`  ${index + 1}. ${event.name} - ${event.date} (${new Date(event.date).toLocaleDateString('fr-FR')})`);
});

// Test AdminDashboardSection (logique corrigée)
console.log('\n🔍 Test AdminDashboardSection:');
const now = new Date();
now.setHours(0, 0, 0, 0);

const adminDashboardEvents = testEvents
  .filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= now;
  })
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

console.log('Événements triés:');
adminDashboardEvents.forEach((event, index) => {
  console.log(`  ${index + 1}. ${event.name} - ${event.date} (${new Date(event.date).toLocaleDateString('fr-FR')})`);
});

// Vérification de l'ordre chronologique
const expectedOrder = ['2026-02-21', '2026-05-09', '2026-06-21'];
const actualOrder = adminDashboardEvents.map(e => e.date);

console.log('\n✅ Vérification de l\'ordre chronologique:');
console.log('Ordre attendu:', expectedOrder);
console.log('Ordre obtenu:', actualOrder);
console.log('Tri correct:', JSON.stringify(expectedOrder) === JSON.stringify(actualOrder) ? '✅ OUI' : '❌ NON');
