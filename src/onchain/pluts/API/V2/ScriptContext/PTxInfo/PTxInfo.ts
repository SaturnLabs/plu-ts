import pstruct from "../../../../PTypes/PStruct/pstruct";
import { list, pair, int, data } from "../../../../Term/Type/base";
import PTxInInfo from "../../Tx/PTxInInfo";
import PTxOut from "../../Tx/PTxOut";
import V1 from "../../../V1";

const PTxInfo = pstruct({
    PTxInfo: {
        inputs: list( PTxInInfo.type ),
        refInputs: list( PTxInInfo.type ),
        outputs: list( PTxOut.type ),
        fee:  V1.PValue.type,
        mint: V1.PValue.type,
        dCertificates: list( V1.PDCert.type ),
        withdrawals: list( pair( V1.PStakingCredential.type, int ) ),
        interval: V1.PPOSIXTimeRange.type,
        signatories: list( V1.PPubKeyHash.type ),
        redeemers: list( pair( V1.PScriptPurpose.type, data ) ),
        datums: list( pair( V1.PDatumHash.type, data ) ),
        id: V1.PTxId.type
    }
})

export default PTxInfo;