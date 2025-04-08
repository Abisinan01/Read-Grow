// dateFilter.js - Create this file in your utils folder
export const createDateFilter = (filter, startDate, endDate) => {
    let dateFilter = {};
    
    if (filter === "custom" && startDate && endDate) {
        dateFilter = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };
    } else if (filter === "daily") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        dateFilter = {
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        };
    } else if (filter === "weekly") {
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        
        dateFilter = {
            createdAt: {
                $gte: lastWeek,
                $lte: today
            }
        };
    } else if (filter === "monthly") {
        const today = new Date();
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        
        dateFilter = {
            createdAt: {
                $gte: lastMonth,
                $lte: today
            }
        };
    } else if (filter === "yearly") {
        const today = new Date();
        const lastYear = new Date(today);
        lastYear.setFullYear(today.getFullYear() - 1);
        
        dateFilter = {
            createdAt: {
                $gte: lastYear,
                $lte: today
            }
        };
    }
    
    return dateFilter;
};