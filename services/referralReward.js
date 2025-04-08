import express from 'express'
import User from '../models/userSchema.js'
import Wallet from '../models/walletSchema.js'

export async function getReferralReward(referralCode, newUserId) {
    try {
        console.log("refrealcode ", referralCode, "newUserId", newUserId);


        const referredUser = await User.findOne({ referralCode: referralCode });
        console.log("referredUser", referredUser);


        if (!referredUser) {
            console.log("No user found with that referral code");
            return;
        }

        const rewardForReferrer = 150;
        const rewardForReferred = 100;

        const transactionID = `TRANS-${Date.now()}`;
        console.log(transactionID)

        const wallet = await Wallet.findOne({ userId: referredUser._id });

        if (wallet) {
            wallet.transactions.push({
                transactionId: transactionID,
                amount: Number(rewardForReferrer),
                transactionType: 'credit',
                source:'referral'
            });
            wallet.balance += Number(rewardForReferrer);
            await wallet.save();
        } else {

            const createWallet = new Wallet({
                userId: referredUser._id,
                transactions: [{
                    transactionId: transactionID,
                    amount: Number(rewardForReferrer),
                    transactionType: 'credit',
                    source:'referral'
                }],
                balance: Number(rewardForReferrer)
            });

            await createWallet.save();
        }


        const newUserWallet = new Wallet({
            userId: newUserId,
            transactions: [{
                transactionId: transactionID,
                amount: Number(rewardForReferred),
                transactionType: 'credit',
                source:'referral'
            }],
            balance: Number(rewardForReferred)
        });

        await newUserWallet.save();

        return { success: true };

    } catch (error) {
        console.log(`Get referralcode is failed ${error}`);
        return { success: false, error: error.message };
    }
}