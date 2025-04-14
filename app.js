var arithmeticTriplets = function(nums, diff) {
    let res = [], j=0
    
    for(let i=0; i<nums.length; i++){
        for(j=0; j<nums.length; j++){
            for(let k=j+1;k<nums.length; k++){
        
                if(diff == nums[k] - nums[j]){
                    console.log(1)
                }
            }
        }
    }
    return res
};
console.log(arithmeticTriplets([0,1,4,6,7,10],3))