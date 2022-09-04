import PData, { DataFromPData } from ".";
import DataList from "../../../../types/Data/DataList";
import UPLCConst from "../../../UPLC/UPLCTerms/UPLCConst";
import { pListToData, punListData } from "../../Prelude/Builtins";
import Term from "../../Term";
import PList from "../PList";

export default class PDataList<PDataInstance extends PData> extends PData // (PData extends PType => PDataList extends PType too)
{
    constructor( datas: DataFromPData<PDataInstance>[] = [] )
    {
        super( new DataList( datas ) );
    }
}

export function pDataList<PDataInstance extends PData>( datas: DataFromPData<PDataInstance>[] ): Term<PDataList<PDataInstance>>
{
    return new Term(
        // Type.Data.List( Type.Data.Int ), // @fixme; add element type based on data consturctor
        _dbn => UPLCConst.data( new DataList( datas ) )
    );
}

export function ptoDataList<PDataListElem extends PData>
    (
        listElemCtor: new () => PDataListElem,
        listTerm: Term<PList<PDataListElem>>
    ): Term<PDataList<PDataListElem>>
{
    return pListToData( listElemCtor ).$( listTerm );
}

export function pListFromData<DataInstance extends PData>( dataIntTerm: Term<PDataList<DataInstance>> ): Term<PList<PData>>
{
    return punListData.$( dataIntTerm );
}