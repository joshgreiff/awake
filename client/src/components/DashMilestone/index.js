import React from "react";

const DashMilestone = ({milestones}) => {
    if(milestones.length === 0) {
        <h4 className="text-black">No Milestones</h4>
    }
    console.log(milestones)
    return (
        <div className="milestone-div">
            {milestones && milestones.map(milestone => (
                <div key={milestone._id} className="milestone">
                    
                    <div>
                        <h4>{milestone.milestoneTitle}</h4>
                    </div>
                    <div>
                        <p>{milestone.milestoneDescription}</p>
                    </div>
                </div>
                
            ))}
        </div>
    )
}

export default DashMilestone