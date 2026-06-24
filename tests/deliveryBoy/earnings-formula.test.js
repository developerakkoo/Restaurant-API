const test = require('node:test');
const assert = require('node:assert/strict');

function calculateDriverEarning({ perDeliveryAmount, bonus16thDelivery, bonus21stDelivery, petrolExpensePerOrder, deliveryCharges, deliveryNumber }) {
  let bonus = 0;
  if (deliveryNumber === 16) {
    bonus = bonus16thDelivery;
  } else if (deliveryNumber === 21) {
    bonus = bonus21stDelivery;
  }

  const commissionAmount = perDeliveryAmount + bonus;
  const petrolExpense = petrolExpensePerOrder ?? 5;
  const amount = commissionAmount + petrolExpense + deliveryCharges;

  return { commissionAmount, petrolExpense, bonus, amount };
}

test('includes delivery charges in the driver earning formula', () => {
  const result = calculateDriverEarning({
    perDeliveryAmount: 20,
    bonus16thDelivery: 10,
    bonus21stDelivery: 15,
    petrolExpensePerOrder: 5,
    deliveryCharges: 35,
    deliveryNumber: 1,
  });

  assert.equal(result.commissionAmount, 20);
  assert.equal(result.petrolExpense, 5);
  assert.equal(result.amount, 60);
});
