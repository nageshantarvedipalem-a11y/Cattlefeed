import { query } from '../../config/database.js';

export const createExpenseRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO expenses (expense_date, category, amount, payment_method, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.expenseDate,
      data.category,
      data.amount,
      data.paymentMethod,
      data.description || null,
      data.createdBy,
    ]
  );
  return result.insertId;
};

export { query };
