import PMaybe from "../../../stdlib/PMaybe/PMaybe";
import pstruct from "../../../PTypes/PStruct/pstruct";
import PCredential from "./PCredential";
import PStakingCredential from "./PStakingCredential";

const PAddress = pstruct({
    PAddress: {
        credential: PCredential.type,
        stakingCredential: PMaybe( PStakingCredential.type ).type
    }
})

export default PAddress;