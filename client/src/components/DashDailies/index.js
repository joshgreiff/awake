import React from "react";

const DashDailies = ({dailies}) => {
    if(!dailies.length) {
        <h4 className="text-black">No Dailies</h4>
    }

    return (
        <div className="daily-div text-black">
            {dailies && dailies.map(daily => (
                <div key={daily._id} className="daily text-black">
                        
                    <div>
                        <h4 className="text-black">{daily.dailyTitle}</h4>
                    </div>
                    <div>
                        <p>{daily.dailyDescription}</p>
                    </div>
                </div>
                
            ))}
        </div>
    )
}

export default DashDailies;