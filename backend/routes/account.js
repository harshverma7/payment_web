require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const { Account, Transaction } = require("../db");
const { authMiddleware } = require("../middlewares/authmiddleware");

mongoose.connect(process.env.MONGODB_URI);

const router = express.Router();

router.get("/balance", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const account = await Account.findOne({ userId });

    res.status(200).json({ balance: account.balance });
  } catch (error) {
    res.status(500).json({ message: "Balance not found" });
  }
});

router.post("/transfer", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const { amount, to } = req.body;

    if (!amount || !to) {
      return res
        .status(400)
        .json({ message: "Amount and recipient are required" });
    }
    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be positive" });
    }
    if (to === req.userId) {
      return res.status(400).json({ message: "Cannot transfer to self" });
    }

    const senderAccount = await Account.findOne({ userId: req.userId }).session(
      session
    );

    if (!senderAccount) {
      await session.abortTransaction();
      res.status(400).json({ message: "Invalid sender" });
    }

    if (senderAccount.balance < amount) {
      await session.abortTransaction();
      res.status(400).json({
        message: "Insufficient balance",
        balance: senderAccount.balance,
      });
    }

    const receiverAccount = await Account.findOne({ userId: to }).session(
      session
    );

    if (!receiverAccount) {
      await session.abortTransaction();
      res.status(400).json({ message: "Invalid receiver" });
    }

    await Transaction.create(
      [
        {
          senderUserId: req.userId,
          receiverUserId: to,
          amount,
        },
      ],
      { session }
    );

    await Account.updateOne(
      { userId: req.userId },
      { $inc: { balance: -amount } }
    ).session(session);
    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } }
    ).session(session);

    await session.commitTransaction();
    res.status(200).json({ message: "Transfer successful" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: "An error occurred during transfer" });
  } finally {
    await session.endSession();
  }
});

router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const query = {
      $or: [{ senderUserId: req.userId }, { receiverUserId: req.userId }],
    };

    const transactions = await Transaction.find(query)
      .populate("senderUserId", " firstname lastname")
      .populate("receiverUserId", " firstname lastname")
      .sort({ timestamp: -1 });

    if (!transactions) {
      throw new Error("No transactions array returned from database");
    }

    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction._id,
      sender: {
        id: transaction.senderUserId._id,
        name: `${transaction.senderUserId.firstname} ${transaction.senderUserId.lastname}`,
      },
      receiver: {
        id: transaction.receiverUserId._id,
        name: `${transaction.receiverUserId.firstname} ${transaction.receiverUserId.lastname}`,
      },
      amount: transaction.amount,
      timestamp: transaction.timestamp,
    }));

    res.json({ transactions: formattedTransactions });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred during fetching transactions" });
  }
});

module.exports = router;
