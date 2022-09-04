import BasePlutsError from "../../../errors/BasePlutsError";
import ObjectUtils from "../../../utils/ObjectUtils";
import { Head } from "../../../utils/ts";
import Application from "../../UPLC/UPLCTerms/Application";
import Builtin from "../../UPLC/UPLCTerms/Builtin";
import UPLCConst from "../../UPLC/UPLCTerms/UPLCConst";
import PType, { ToCtors } from "../PType";
import PBool, { pBool } from "../PTypes/PBool";
import PByteString from "../PTypes/PByteString";
import PData from "../PTypes/PData";
import PDataBS from "../PTypes/PData/PDataBS";
import PDataConstr from "../PTypes/PData/PDataConstr";
import PDataInt from "../PTypes/PData/PDataInt";
import PDataList from "../PTypes/PData/PDataList";
import PDataMap from "../PTypes/PData/PDataMap";
import PDelayed from "../PTypes/PDelayed";
import PFn from "../PTypes/PFn";
import PLam, { TermFn } from "../PTypes/PFn/PLam";
import PInt from "../PTypes/PInt";
import PList from "../PTypes/PList";
import PPair, { PMap } from "../PTypes/PPair";
import PString from "../PTypes/PString";
import PUnit from "../PTypes/PUnit";
import { papp, pdelay, pfn, pforce, plam } from "../Syntax";
import phoist from "../Term/HoistedTerm";
import Type, { DataType, ToPType, Type as Ty } from "../Term/Type";
import TermBool, { addPBoolMethods } from "./TermBool";
import TermBS, { addPByteStringMethods } from "./TermBS";
import TermInt, { addPIntMethods } from "./TermInt";
import TermStr, { addPStringMethods } from "./TermStr";
import Term from "../Term/index";
import { getNRequiredArgs } from "../Term/Type/utils";

export function addApplications<Ins extends [ PType, ...PType[] ], Out extends PType, TermOutput extends TermFn< Ins, Out > = TermFn< Ins, Out >>
    (
        lambdaTerm: Term< PFn< Ins, Out > >,
        addOutputMethods?: ( termOut: Term<Out> ) => TermOutput
    )
    : TermOutput
{
    const nMissingArgs = getNRequiredArgs( lambdaTerm.type );

    if( nMissingArgs <= 1 )
    {
        return ObjectUtils.defineReadOnlyProperty(
            lambdaTerm,
            "$",
            ( input: Term< Head<Ins> > ) => {
                let output: any = papp( lambdaTerm, input );

                if( addOutputMethods !== undefined )
                {
                    output = addOutputMethods( output );
                }

                return output;
            }
        ) as any;
    }

    return ObjectUtils.defineReadOnlyProperty(
        lambdaTerm,
        "$",
        ( input: Term< Head<Ins> > ) =>
            // @ts-ignore
            // Type 'PType[]' is not assignable to type '[PType, ...PType[]]'.
            // Source provides no match for required element at position 0 in target
            addApplications< Tail<Ins>, Out >(
                papp( lambdaTerm , input ) as any,
                addOutputMethods
            )
    ) as any;
}

export type MultiPLam<Args extends [ PType, PType, ...PType[] ]> =
    Args extends [ infer PA extends PType, infer PB extends PType ] ? PLam<PA,PB> :
    Args extends [ infer PA extends PType, infer PB extends PType , infer PC extends PType ] ? PLam<PA,PLam<PB, PC> > :
    Args extends [ infer PA extends PType, ...infer Ps extends [ PType, PType,...PType[] ] ] ? PLam<PA, MultiPLam<Ps> > :
    never

export function makePLamObj<A extends PType,B extends PType, Cs extends PType[]>
    ( a: A, b: B, ...ptypes: Cs ): MultiPLam<[A,B,...Cs]>
{
    if( ptypes.length === 0 ) return new PLam( a, b ) as any;
    return new PLam( a, makePLamObj( b , ptypes[0] , ...ptypes.slice(1) ) ) as MultiPLam<[A, B, ...Cs]>;
}

export type IntBinOPToInt = Term< PLam< PInt, PLam< PInt, PInt >>>
& {
    $: ( input: Term<PInt> ) => 
        Term<PLam<PInt,PInt>>
        & {
            $: ( input: Term<PInt> ) => 
                TermInt
        }
}

function intBinOpToInt( builtin: Builtin )
    : IntBinOPToInt
{
    const op = new Term<PLam<PInt, PLam<PInt, PInt>>>(
        Type.Fn([ Type.Int, Type.Int ], Type.Int ),
        _dbn => builtin
    );

    return  ObjectUtils.defineReadOnlyProperty(
        op,
        "$",
        ( fstIn: Term<PInt> ): Term<PLam<PInt, PInt>> => {
            const oneIn = papp( op, fstIn );

            return ObjectUtils.defineReadOnlyProperty(
                oneIn,
                "$",
                ( sndIn: Term<PInt> ): TermInt => {
                    return addPIntMethods( papp( oneIn, sndIn ) )
                }
            ) as any;
        }
    ) as any;
}

export type IntBinOPToBool = Term< PLam< PInt, PLam< PInt, PInt >>>
& {
    $: ( input: Term<PInt> ) => 
        Term<PLam<PInt,PInt>>
        & {
            $: ( input: Term<PInt> ) => 
                TermBool
        }
}

function intBinOpToBool( builtin: Builtin )
    : IntBinOPToBool
{
    const op = new Term<PLam<PInt, PLam<PInt, PBool>>>(
        Type.Fn([ Type.Int, Type.Int ], Type.Bool ),
        _dbn => builtin
    );

    return  ObjectUtils.defineReadOnlyProperty(
        op,
        "$",
        ( fstIn: Term<PInt> ): Term<PLam<PInt, PInt>> => {
            const oneIn = papp( op, fstIn );

            return ObjectUtils.defineReadOnlyProperty(
                oneIn,
                "$",
                ( sndIn: Term<PInt> ): TermBool => {
                    return addPBoolMethods( papp( oneIn, sndIn ) )
                }
            ) as any;
        }
    ) as any;
}

export type ByteStrBinOPToBS = Term< PLam< PByteString, PLam< PByteString, PByteString >>>
& {
    $: ( input: Term<PByteString> ) => 
        Term<PLam<PByteString,PByteString>>
        & {
            $: ( input: Term<PByteString> ) => 
                TermBS
        }
}

function byteStrBinOpToBS( builtin: Builtin )
    : ByteStrBinOPToBS
{
    const op = new Term<PLam<PByteString, PLam<PByteString, PByteString>>>(
        Type.Fn([ Type.BS, Type.BS ], Type.BS ),
        _dbn => builtin
    );

    return  ObjectUtils.defineReadOnlyProperty(
        op,
        "$",
        ( fstIn: Term<PByteString> ): Term<PLam<PByteString, PByteString>> => {
            const oneIn = papp( op, fstIn );

            return ObjectUtils.defineReadOnlyProperty(
                oneIn,
                "$",
                ( sndIn: Term<PByteString> ): TermBS => {
                    return addPByteStringMethods( papp( oneIn as any, sndIn ) )
                }
            ) as any;
        }
    ) as any;
}

export type ByteStrBinOPToBool = Term< PLam< PByteString, PLam< PByteString, PBool >>>
& {
    $: ( input: Term<PByteString> ) => 
        Term<PLam<PByteString,PBool>>
        & {
            $: ( input: Term<PByteString> ) => 
                TermBool
        }
}

function byteStrBinOpToBool( builtin: Builtin )
    : ByteStrBinOPToBool
{
    const op = new Term<PLam<PByteString, PLam<PByteString, PBool>>>(
        Type.Fn([ Type.BS, Type.BS ], Type.Bool ),
        _dbn => builtin
    );

    return  ObjectUtils.defineReadOnlyProperty(
        op,
        "$",
        ( fstIn: Term<PByteString> ): Term<PLam<PByteString, PBool>> => {
            const oneIn = papp( op, fstIn );

            return ObjectUtils.defineReadOnlyProperty(
                oneIn,
                "$",
                ( sndIn: Term<PByteString> ): TermBool => {
                    return addPBoolMethods( papp( oneIn as any, sndIn ) )
                }
            ) as any;
        }
    ) as any;
}

export const padd   = intBinOpToInt( Builtin.addInteger);
export const psub   = intBinOpToInt( Builtin.subtractInteger);
export const pmult  = intBinOpToInt( Builtin.multiplyInteger);
export const pdiv   = intBinOpToInt( Builtin.divideInteger);
export const pquot  = intBinOpToInt( Builtin.quotientInteger);
export const prem   = intBinOpToInt( Builtin.remainderInteger);
export const pmod   = intBinOpToInt( Builtin.modInteger);

export const peqInt     = intBinOpToBool( Builtin.equalsInteger );
export const plessInt   = intBinOpToBool( Builtin.lessThanInteger );
export const plessEqInt = intBinOpToBool( Builtin.lessThanEqualInteger );

export const pgreaterInt: IntBinOPToBool =
    phoist(
        pfn([ Type.Int, Type.Int ], Type.Bool )(
            ( a: Term<PInt>, b: Term<PInt> ): TermBool => plessInt.$( b ).$( a )
        )
    ) as any;

export const pgreaterEqInt: IntBinOPToBool =
    phoist(
        pfn([ Type.Int, Type.Int ], Type.Bool )(
            ( a: Term<PInt>, b: Term<PInt> ): TermBool => plessEqInt.$( b ).$( a )
        )
    ) as any;

export const pappendBs = byteStrBinOpToBS( Builtin.appendByteString );
export const pconsBs: Term<PLam<PInt, PLam< PByteString, PByteString>>>
& {
    $: ( input: Term<PInt> ) => 
        Term<PLam<PByteString,PByteString>>
        & {
            $: ( input: Term<PByteString> ) => 
                TermBS
        }
} = (() => {
    const consByteString = new Term<PFn<[ PInt, PByteString], PByteString>>(
        Type.Fn([ Type.Int, Type.BS ], Type.BS ),
        _dbn => Builtin.consByteString
    );

    return  ObjectUtils.defineReadOnlyProperty(
        consByteString,
        "$",
        ( byte: Term<PInt> ): Term<PLam<PByteString, PByteString>> => {
            const consByteStringFixedByte = papp( consByteString, byte );

            return ObjectUtils.defineReadOnlyProperty(
                consByteStringFixedByte,
                "$",
                ( toByteString: Term<PByteString> ): TermBS => {
                    return addPByteStringMethods( papp( consByteStringFixedByte, toByteString ) )
                }
            ) as any;
        }
    ) as any;
})()

export const psliceBs: Term<PLam<PInt, PLam< PInt, PLam< PByteString, PByteString>>>>
& {
    $: ( fromIndex: Term<PInt> ) => 
        Term<PLam< PInt, PLam<PByteString,PByteString>>>
        & {
            $: ( ofLength: Term<PInt> ) => 
                Term<PLam<PByteString,PByteString>>
                & {
                    $: ( onByteString: Term<PByteString> ) => TermBS
                }
        }
} = (() => {
    const sliceBs = new Term<PFn<[ PInt, PInt, PByteString ], PByteString>>(
        Type.Fn([ Type.Int, Type.Int, Type.BS ], Type.BS ),
        _dbn => Builtin.sliceByteString,
    );

    return ObjectUtils.defineReadOnlyProperty(
        sliceBs,
        "$",
        ( fromIndex: Term<PInt> ): Term<PLam< PInt, PLam<PByteString,PByteString>>>
        & {
            $: ( ofLength: Term<PInt> ) => 
                Term<PLam<PByteString,PByteString>>
                & {
                    $: ( onByteString: Term<PByteString> ) => TermBS
                }
        } =>{
            const sliceBsFromIdx = papp( sliceBs, fromIndex );
            
            return ObjectUtils.defineReadOnlyProperty(
                sliceBsFromIdx,
                "$",
                ( ofLength: Term<PInt> ): Term<PLam< PInt, PLam<PByteString,PByteString>>>
                & {
                    $: ( ofLength: Term<PInt> ) => 
                        Term<PLam<PByteString,PByteString>>
                        & {
                            $: ( onByteString: Term<PByteString> ) => TermBS
                        }
                } => {
                    const sliceBsFromIdxOfLength = papp( sliceBsFromIdx, ofLength );

                    return ObjectUtils.defineReadOnlyProperty(
                        sliceBsFromIdxOfLength,
                        "$",
                        ( onByteString: Term<PByteString> ): TermBS =>
                            addPByteStringMethods( papp( sliceBsFromIdxOfLength, onByteString ) )
                    ) as any
                }
            ) as any
        }
    )
})();

export const plengthBs
    :TermFn<[ PByteString ], PInt >
    & {
        $: ( ofByteString: Term<PByteString> ) => TermInt
    }
    = (() => {
        const lenBS = new Term<PLam< PByteString, PInt >>(
            Type.Lambda( Type.BS, Type.Int ),
            _dbn => Builtin.lengthOfByteString,
        );

        return ObjectUtils.defineReadOnlyProperty(
            lenBS,
            "$",
            ( ofByteString: Term<PByteString> ): TermInt =>
                addPIntMethods( papp( lenBS, ofByteString ) )
        );
    })();

export const pindexBs
    : Term<PLam<PByteString, PLam<PInt , PInt>>>
    & {
        $: ( ofByteString: Term<PByteString> ) =>
            Term<PLam<PInt, PInt>>
            & {
                $: ( index: Term<PInt> ) => TermInt
            }
    }
    = (() => {
        const idxBS = new Term<PFn<[ PByteString, PInt ], PInt>>(
                Type.Fn([ Type.BS, Type.Int ], Type.Int ),
                _dbn => Builtin.indexByteString,
            );
        
        return ObjectUtils.defineReadOnlyProperty(
            idxBS,
            "$",
            ( ofByteString: Term<PByteString> ):
                Term<PLam<PInt, PInt>>
                & {
                    $: ( index: Term<PInt> ) => TermInt
                } =>
            {
                const idxOfBS = papp( idxBS, ofByteString );

                return ObjectUtils.defineReadOnlyProperty(
                    idxOfBS,
                    "$",
                    ( index: Term<PInt> ): TermInt =>
                        addPIntMethods( papp( idxOfBS, index ) )
                ) as any;
            }
        )
    })();

export const peqBs      = byteStrBinOpToBool( Builtin.equalsByteString );
export const plessBs    = byteStrBinOpToBool( Builtin.lessThanByteString );
export const plessEqBs  = byteStrBinOpToBool( Builtin.lessThanEqualsByteString );

export const pgreaterBS: ByteStrBinOPToBool =
    phoist(
        pfn([ Type.BS, Type.BS ], Type.Bool )(
            ( a: Term<PByteString>, b: Term<PByteString> ): TermBool => plessBs.$( b ).$( a )
        )
    ) as any;

export const pgreaterEqBS: ByteStrBinOPToBool =
    phoist(
        pfn([ Type.BS, Type.BS ], Type.Bool )(
            ( a: Term<PByteString>, b: Term<PByteString> ): TermBool => plessEqBs.$( b ).$( a )
        )
    ) as any;

export const psha2_256: TermFn<[ PByteString ], PByteString > =
    addApplications<[ PByteString ], PByteString >(
        new Term(
            Type.Lambda( Type.BS, Type.BS ),
            _dbn => Builtin.sha2_256
        )
    );
export const psha3_256: TermFn<[ PByteString ], PByteString > =
    addApplications<[ PByteString ], PByteString >(
        new Term(
            Type.Lambda( Type.BS, Type.BS ),
            _dbn => Builtin.sha3_256
        )
    );
export const pblake2b_256: TermFn<[ PByteString ], PByteString > =
    addApplications<[ PByteString ], PByteString >(
        new Term(
            Type.Lambda( Type.BS, Type.BS ),
            _dbn => Builtin.blake2b_256
        )
    );

/**
 * performs cryptographic signature verification using the Ed25519 scheme
 * 
 * @param {PByteString} key ```PByteString``` of length 32 ( ```PubKeyHash``` )
 * @param {PByteString} message abitrary length ```PByteString```
 * @param {PByteString} signature ```PByteString``` of length 64
 * @returns {PBool} 
 * 
 * @throws
 * @fails
 */
export const pverifyEd25519: TermFn<[ PByteString, PByteString, PByteString ], PBool > =
    addApplications<[ PByteString, PByteString, PByteString ], PBool >(
        new Term(
            Type.Fn([ Type.BS, Type.BS, Type.BS ], Type.Bool),
            _dbn => Builtin.verifyEd25519Signature
        )
    );



export type StrBinOPToStr = Term<PLam<PString, PLam<PString,PString>>>
& {
    $: ( input: Term<PString> ) => 
        Term<PLam<PString,PString>>
        & {
            $: ( input: Term<PString> ) => 
                TermStr
        }
}

export const pappendStr: StrBinOPToStr = (() => {
    const op = new Term<PLam<PString, PLam<PString,PString>>>(
        Type.Fn([ Type.Str, Type.Str ], Type.Str ),
        _dbn => Builtin.appendString
    );

    return  ObjectUtils.defineReadOnlyProperty(
        op,
        "$",
        ( fstIn: Term<PString> ): Term<PLam<PString, PString>> => {
            const oneIn = papp( op, fstIn );

            return ObjectUtils.defineReadOnlyProperty(
                oneIn,
                "$",
                ( sndIn: Term<PString> ): TermStr => {
                    return addPStringMethods( papp( oneIn, sndIn ) )
                }
            ) as any;
        }
    ) as any;
})();

export type StrBinOPToBool = Term<PLam<PString,PLam<PString, PBool>>>
& {
    $: ( input: Term<PString> ) => 
        Term<PLam<PString,PBool>>
        & {
            $: ( input: Term<PString> ) => 
                TermBool
        }
}
export const peqStr: StrBinOPToBool = (() => {
    const op = new Term<PLam<PString,PLam<PString, PBool>>>(
        Type.Fn([ Type.Str, Type.Str ], Type.Bool ),
        _dbn => Builtin.equalsString,
    );

    return  ObjectUtils.defineReadOnlyProperty(
        op,
        "$",
        ( fstIn: Term<PString> ): Term<PLam<PString, PBool>> => {
            const oneIn = papp( op, fstIn );

            return ObjectUtils.defineReadOnlyProperty(
                oneIn,
                "$",
                ( sndIn: Term<PString> ): TermBool => {
                    return addPBoolMethods( papp( oneIn, sndIn ) )
                }
            ) as any;
        }
    ) as any;
})();

export const pencodeUtf8: Term<PLam<PString, PByteString>>
& {
    $: ( str: Term<PString> ) => TermBS
} = (() => {
    const encodeUtf8  =new Term<PLam<PString, PByteString>>(
            Type.Lambda( Type.Str, Type.BS ),
            _dbn => Builtin.encodeUtf8
        );

    return ObjectUtils.defineReadOnlyProperty(
        encodeUtf8,
        "$",
        ( str: Term<PString> ): TermBS => addPByteStringMethods( papp( encodeUtf8, str ) )
    )
})()

export const pdecodeUtf8: Term<PLam<PByteString, PString>>
& {
    $: ( str: Term<PByteString> ) => TermStr
} = (() => {
    const decodeUtf8  =new Term<PLam<PByteString, PString>>(
        Type.Lambda( Type.BS, Type.Str ),
        _dbn => Builtin.decodeUtf8,
        );

    return ObjectUtils.defineReadOnlyProperty(
        decodeUtf8,
        "$",
        ( byteStr: Term<PByteString> ): TermStr => addPStringMethods( papp( decodeUtf8, byteStr ) )
    )
})()


export function pstrictIf<ReturnT extends Ty>( returnT: ReturnT ): TermFn<[ PBool, ToPType<ReturnT>, ToPType<ReturnT> ], ToPType<ReturnT>>
{
    return addApplications<[ PBool, ToPType<ReturnT>, ToPType<ReturnT> ], ToPType<ReturnT>>(
        new Term<
            PLam<
                PBool,
                PLam<
                    ToPType<ReturnT>,
                    PLam<
                        ToPType<ReturnT>,
                        ToPType<ReturnT>
                    >
                >
            >
        >
        (
            Type.Fn([ Type.Bool, returnT, returnT ], returnT ) as any,
            _dbn => Builtin.ifThenElse
        ) as any
    ) as any;
}

export function pif<ReturnT extends Ty>( returnT: ReturnT )
    : Term<PLam<PBool, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, ToPType<ReturnT>>>>> 
    & {
        $: (condition: Term<PBool>) =>
            Term<PLam< ToPType<ReturnT>, PLam< ToPType<ReturnT>, ToPType<ReturnT>>>> 
            & {
                then: ( caseTrue: Term<ToPType<ReturnT>> ) =>
                    TermFn<[ ToPType<ReturnT> ], ToPType<ReturnT> >
                    & {
                        else: ( caseTrue: Term<ToPType<ReturnT>> ) =>
                        Term<ToPType<ReturnT>> 
                    },
                $: ( caseTrue: Term<ToPType<ReturnT>> ) =>
                    TermFn<[ ToPType<ReturnT> ], ToPType<ReturnT> > & {
                        else: ( caseTrue: Term<ToPType<ReturnT>> ) =>
                        Term<ToPType<ReturnT>> 
                    }
            }
    }
{
    // new term identical to the strict one in order to define new (different) "$" properties
    const _lambdaIf = new Term<
        PLam<
            PBool,
            PLam<
                ToPType<ReturnT>,
                PLam<
                    ToPType<ReturnT>,
                    ToPType<ReturnT>
                >
            >
        >
    >(
        // type is different from the one specified by the generic because
        // ```papp``` throws if types don't match;
        // but the perceived type form the user perspective is the one of the generic
        Type.Fn([ Type.Bool, Type.Delayed( returnT ), Type.Delayed( returnT ) ], Type.Delayed( returnT ) ) as any,
        _dbn => Builtin.ifThenElse
    );

    return ObjectUtils.defineReadOnlyProperty(
        _lambdaIf,
        "$",
        ( condition: Term< PBool > ): TermFn<[ ToPType<ReturnT>, ToPType<ReturnT> ], ToPType<ReturnT> > => (() => {
            
            /*
            [ (builtin ifThenElse) condition ]
            */
            const _lambdaIfThen = papp( _lambdaIf, condition );

            const _lambdaIfThenApp = ObjectUtils.defineReadOnlyProperty(
                _lambdaIfThen,
                "$",
                //@ts-ignore
                ( caseTrue: Term<ToPType<ReturnT>> ): TermFn<[ ToPType<ReturnT> ],ToPType<ReturnT>> => (() => {
                    /*
                    [
                        [ (builtin ifThenElse) condition ]
                        (delay case true)
                    ]
                    */
                    const _lambdaIfThenElse = papp( _lambdaIfThen, pdelay( caseTrue ) as any );

                    const _lambdaIfThenElseApp = ObjectUtils.defineReadOnlyProperty(
                        _lambdaIfThenElse,
                        "$",
                        ( caseFalse: Term<ToPType<ReturnT>> ): Term< ToPType<ReturnT> > =>
                            /*
                            (force [
                                [
                                    [ (builtin ifThenElse) condition ]
                                    (delay caseTrue)
                                ]
                                (delay caseFalse)
                            ])
                            */
                            pforce( papp( _lambdaIfThenElse, pdelay( caseFalse ) as any ) as any )
                    );
                    
                    return ObjectUtils.defineReadOnlyProperty(
                        _lambdaIfThenElseApp,
                        "else",
                        _lambdaIfThenElseApp.$
                    );
                })() 
            );

            return ObjectUtils.defineReadOnlyProperty(
                _lambdaIfThenApp,
                "then",
                _lambdaIfThenApp.$
            );
        })()
    ) as any;
}

export const pnot
    : Term<PLam<PBool, PBool>>
    & {
        $: ( bool: Term<PBool> ) => TermBool
    }
    =
    phoist(
        plam( Type.Bool, Type.Bool )
        ( bool => 
            addPBoolMethods(
                pstrictIf( Type.Bool ).$( bool )
                .$( pBool( false ) )
                .$( pBool( true  ) )
            )
        )
    ) as any;

export const pand
    : Term<PLam<PBool, PLam<PBool, PBool>>>
    & {
        $: ( bool: Term<PBool> ) =>
            Term<PLam<PBool, PBool>>
            & {
                $: ( bool: Term<PBool> ) => TermBool
            }
    }
    = phoist(
        pfn([ Type.Bool, Type.Bool ], Type.Bool )
        (( a: Term<PBool>, b: Term<PBool> ) =>
            addPBoolMethods(
                pif( Type.Bool ).$( a )
                .then( b )
                .else( pBool( false ) )
            )
        )
    ) as any;

export const por
    : Term<PLam<PBool, PLam<PBool, PBool>>>
    & {
        $: ( bool: Term<PBool> ) =>
            Term<PLam<PBool, PBool>>
            & {
                $: ( bool: Term<PBool> ) => TermBool
            }
    }
    = phoist(
        pfn([ Type.Bool, Type.Bool ], Type.Bool )
        (( a: Term<PBool>, b: Term<PBool> ) =>
            addPBoolMethods(
                pif( Type.Bool ).$( a )
                .then( pBool( true ) )
                .else( b )
            )
        )
    ) as any;

export function pchooseUnit<ReturnT extends Ty>( returnT: ReturnT )
    : TermFn<[ PUnit, ToPType<ReturnT> ], ToPType<ReturnT>>
{
    return addApplications<[ PUnit, ToPType<ReturnT> ], ToPType<ReturnT>>(
        new Term(
            Type.Fn([ Type.Unit, returnT ], returnT ),
            _dbn => Builtin.chooseUnit,
        )
    );
}

export function ptracet<ReturnT extends Ty>( returnT: ReturnT )
    : TermFn<[ PString, ToPType<ReturnT> ], ToPType<ReturnT>>
{
    return addApplications<[ PString, ToPType<ReturnT> ], ToPType<ReturnT> >(
        new Term(
            Type.Fn([ Type.Str, returnT ], returnT ),
            _dbn => Builtin.trace
        )
    );
}

export function pfstPair<A extends Ty, B extends Ty>( a: A, b: B )
    : TermFn<[ PPair<ToPType<A>,ToPType<B>> ], ToPType<A> >
{
    return addApplications<[ PPair<ToPType<A>,ToPType<B>> ], ToPType<A> >(
        new Term(
            Type.Lambda( Type.Pair( a, b ), a ),
            _dbn => Builtin.fstPair
        )
    );
}

export function psndPair<A extends Ty, B extends Ty>( a: A, b: B )
    : TermFn<[ PPair<ToPType<A>,ToPType<B>> ], ToPType<B>>
{
    return addApplications<[ PPair<ToPType<A>,ToPType<B>> ], ToPType<B>>(
        new Term(
            Type.Lambda( Type.Pair( a, b ), b ),
            _dbn => Builtin.sndPair
        )
    );
}

export function pstrictChooseList<ListElemT extends Ty, ReturnT extends Ty>( listElemT: ListElemT, returnT: ReturnT )
    : TermFn<[ PList< ToPType<ListElemT> > , ToPType<ReturnT>, ToPType<ReturnT> ], ToPType<ReturnT> >
{
    return addApplications<[ PList< ToPType<ListElemT> > , ToPType<ReturnT>, ToPType<ReturnT> ], ToPType<ReturnT> >(
        new Term(
            Type.Fn([ Type.List( listElemT ), returnT, returnT ], returnT ),
            _dbn => Builtin.chooseList
        )
    );
}


export function pchooseList<ListElemT extends Ty, ReturnT extends Ty>( listElemT: ListElemT, returnT: ReturnT )
    : Term<PLam< PList< ToPType<ListElemT> > , PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, ToPType<ReturnT>>>>>
    & {
        $: ( list: Term<PList< ToPType<ListElemT> >>) =>
            Term<PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, ToPType<ReturnT>>>>
            & {
                caseNil: ( nilCase: Term<ToPType<ReturnT>> ) =>
                    TermFn<[ ToPType<ReturnT> ], ToPType<ReturnT> >
                    & {
                        caseCons: ( consCase: Term<ToPType<ReturnT>> ) =>
                        Term<ToPType<ReturnT>> 
                    },
                $: ( nilCase: Term<ToPType<ReturnT>> ) =>
                    TermFn<[ ToPType<ReturnT> ], ToPType<ReturnT> > & {
                        caseCons: ( consCase: Term<ToPType<ReturnT>> ) =>
                        Term<ToPType<ReturnT>> 
                    }
            }
    }
{
    // new term identical to the strict one in order to define new (different) "$" properties
    const _chooseList = new Term<
        PLam<
            PList<ToPType<ListElemT>>,
            PLam<
                ToPType<ReturnT>,
                PLam<
                    ToPType<ReturnT>,
                    ToPType<ReturnT>
                >
            >
        >
    >(
        Type.Fn([Type.List( listElemT ), Type.Delayed( returnT ), Type.Delayed( returnT )], returnT ),
        _dbn => Builtin.chooseList
    );

    return ObjectUtils.defineReadOnlyProperty(
        _chooseList,
        "$",
        ( list: Term<PList<ToPType<ListElemT>>> ) => {

            const _chooseListNil = papp( _chooseList, list );

            const _chooseListNilApp = ObjectUtils.defineReadOnlyProperty(
                _chooseListNil,
                "$",
                ( nilCase: Term<ToPType<ReturnT>> ) => {

                    const _chooseListNilCons = papp( _chooseListNil, pdelay( nilCase ) as any );

                    const _chooseListNilConsApp = ObjectUtils.defineReadOnlyProperty(
                        _chooseListNilCons,
                        "$",
                        ( consCase: Term<ToPType<ReturnT>> ) => {

                            return pforce(
                                papp(
                                    _chooseListNilCons,
                                    pdelay( consCase ) as any
                                ) as any
                            );
                        }
                    );

                    return ObjectUtils.defineReadOnlyProperty(
                        _chooseListNilConsApp,
                        "caseCons",
                        _chooseListNilConsApp.$
                    )
                }
            );

            return ObjectUtils.defineReadOnlyProperty(
                _chooseListNilApp,
                "caseNil",
                _chooseListNilApp.$
            );
        }
    ) as any;
}

export function pprepend<ListElemT extends Ty>( listElemT: ListElemT )
    : TermFn<[ ToPType<ListElemT> , PList< ToPType<ListElemT> > ], PList< ToPType<ListElemT> > >
{
    return addApplications<[ ToPType<ListElemT> , PList< ToPType<ListElemT> > ], PList< ToPType<ListElemT> > >(
        new Term(
            Type.Fn([ listElemT, Type.List( listElemT ) ], Type.List( listElemT ) ),
            _dbn => Builtin.mkCons
        )
    );
}

export function phead<ListElemT extends Ty>( listElemT: ListElemT )
    : TermFn<[ PList<ToPType<ListElemT>> ], ToPType<ListElemT>>
{
    return addApplications<[ PList< ToPType<ListElemT> > ], ToPType<ListElemT> >(
        new Term(
            Type.Lambda( Type.List( listElemT ), listElemT ),
            _dbn => Builtin.headList
        )
    );
}

export function ptail<ListElemT extends Ty>( listElemT: ListElemT )
    : TermFn<[ PList< ToPType<ListElemT> > ], PList< ToPType<ListElemT> > >
{
    return addApplications<[ PList< ToPType<ListElemT> > ], PList< ToPType<ListElemT> > >(
        new Term(
            Type.Lambda( Type.List( listElemT ), Type.List( listElemT ) ),
            _dbn => Builtin.tailList
        )
    );
}

export const pisEmpty: TermFn<[PList<PType>], PBool> = addApplications<[ PList<PType> ], PBool >(
        new Term(
            Type.Lambda( Type.List( Type.Any ), Type.Bool ),
            _dbn => Builtin.nullList
        )
    );

/**
 * in theory 'chooseData' has 5 type parameters (1 per data constructor)
 * and this means any of those types can be returned
 * 
 * plu-ts wont support that in favor of type determinism
 */
export function pstrictChooseData<ReturnT extends Ty>( returnT: ReturnT )
    : TermFn<[ PData, ToPType<ReturnT>, ToPType<ReturnT>, ToPType<ReturnT>, ToPType<ReturnT>, ToPType<ReturnT> ], ToPType<ReturnT> >
{
    return addApplications<[ PData, ToPType<ReturnT>, ToPType<ReturnT>, ToPType<ReturnT>, ToPType<ReturnT>, ToPType<ReturnT> ], ToPType<ReturnT> >(
        new Term(
            Type.Fn(
                [ Type.Data.Any, returnT, returnT, returnT, returnT, returnT ], returnT
            ),
            _dbn => Builtin.chooseData
        )
    );
}

// only for pchooseData Type definition
// without this it would be impossoble to read
type CaseBFn<RetT extends PType> = ( bCase: Term< RetT > ) => Term<RetT>
export type CaseIFn<RetT extends PType> = ( iCase: Term< RetT > ) =>
    Term<PLam<RetT , RetT >>
    & {
        caseB: CaseBFn<RetT>
        $: CaseBFn<RetT>
    };
export type CaseListFn<RetT extends PType> = ( listCase: Term<RetT> ) =>
    Term<PLam<RetT, PLam<RetT , RetT >>>
    & {
        caseI: CaseIFn<RetT>,
        $: CaseIFn<RetT>
    }
export type CaseMapFn<RetT extends PType> = ( mapCase: Term< RetT > ) => 
    Term<PLam<RetT, PLam<RetT, PLam<RetT , RetT >>>>
    & {
        caseList: CaseListFn<RetT>,
        $: CaseListFn<RetT>
    }
export type CaseConstrFn<RetT extends PType> = ( constrCase: Term< RetT > ) =>
    Term<PLam<RetT, PLam<RetT, PLam<RetT, PLam<RetT , RetT >>>>>
    & {
        caseMap: CaseMapFn<RetT>,
        $: CaseMapFn<RetT>
    }

/*
@fixme implement a recursive utility function to

automatically add delays to all alrguments except the first;
add aliases for the applications except the first;
force the last application (once provided argument and delayed)
*/
export function pchooseData<ReturnT extends Ty>( returnT: ReturnT )
    : Term< PLam< PData, PLam< ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT> , ToPType<ReturnT> >>>>>>>
    & {
        $: ( pdata: Term<PData> ) =>
            Term<PLam< ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT> , ToPType<ReturnT> >>>>>>
            & {
                caseConstr: CaseConstrFn<ToPType<ReturnT>>,
                $: CaseConstrFn<ToPType<ReturnT>>
            }
    }
{
    // new term identical to the strict one in order to define new (different) "$" properties
    const _chooseData  =new Term<
        PLam<
            PData,
            PLam<
                ToPType<ReturnT>,
                PLam<
                    ToPType<ReturnT>,
                    PLam<
                        ToPType<ReturnT>,
                        PLam<
                            ToPType<ReturnT>,
                            PLam<
                                ToPType<ReturnT>,
                                ToPType<ReturnT>
                            >
                        >
                    >
                >
            >
        >
    >(
        Type.Fn(
            [ Type.Data.Any, Type.Delayed( returnT ), Type.Delayed( returnT ), Type.Delayed( returnT ), Type.Delayed( returnT ), Type.Delayed( returnT ) ], returnT
        ),
        _dbn => Builtin.chooseData
    );

    return ObjectUtils.defineReadOnlyProperty(
        _chooseData,
        "$",
        ( data: Term<PData> ): Term<PLam< ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT>, PLam<ToPType<ReturnT> , ToPType<ReturnT> >>>>>>
            & {
                caseConstr: CaseConstrFn<ToPType<ReturnT>>,
                $: CaseConstrFn<ToPType<ReturnT>>
            } => {
            const _cDWithData = papp( _chooseData, data );

            const _cDWithDataApp = ObjectUtils.defineReadOnlyProperty(
                _cDWithData,
                "$",
                ( caseConstr: Term<ToPType<ReturnT>> ) => {
                    const _cDDWithConstr = papp( _cDWithData, pdelay(caseConstr) as any );

                    const _cDDWithConstrApp = ObjectUtils.defineReadOnlyProperty(
                        _cDDWithConstr,
                        "$",
                        ( mapCase: Term< ToPType<ReturnT> > ) => {
                            const _cDDCWithMap = papp( _cDDWithConstr, pdelay( mapCase ) as any );

                            const _cDDCWithMapApp = ObjectUtils.defineReadOnlyProperty(
                                _cDDCWithMap,
                                "$",
                                ( listCase: Term< ToPType<ReturnT> > ) => {
                                    const _cDDCMWithList = papp( _cDDCWithMap, pdelay( listCase ) as any );

                                    const _cDDCMWithListApp = ObjectUtils.defineReadOnlyProperty(
                                        _cDDCMWithList,
                                        "$",
                                        ( iCase: Term<ToPType<ReturnT>> ) => {
                                            const _cDDCMLWithInt = papp( _cDDCMWithList, pdelay( iCase ) as any );

                                            const _cDDCMLWithIntApp = ObjectUtils.defineReadOnlyProperty(
                                                _cDDCMLWithInt,
                                                "$",
                                                ( bCase: Term<ToPType<ReturnT>> ) : Term<ToPType<ReturnT>> => {
                                                    return pforce(
                                                        papp( _cDDCMLWithInt, pdelay( bCase ) as any ) as any
                                                    );
                                                }
                                            );

                                            return ObjectUtils.defineReadOnlyProperty(
                                                _cDDCMLWithIntApp,
                                                "caseB",
                                                _cDDCMLWithIntApp.$
                                            );
                                        }
                                    )

                                    return ObjectUtils.defineReadOnlyProperty(
                                        _cDDCMWithListApp,
                                        "caseI",
                                        _cDDCMWithListApp.$
                                    );
                                }
                            )

                            return ObjectUtils.defineReadOnlyProperty(
                                _cDDCWithMapApp,
                                "caseList",
                                _cDDCWithMapApp.$
                            );

                        }
                    )

                    return ObjectUtils.defineReadOnlyProperty(
                        _cDDWithConstrApp,
                        "caseMap",
                        _cDDWithConstrApp.$
                    );
                }
            );

            return ObjectUtils.defineReadOnlyProperty(
                _cDWithDataApp,
                "caseConstr",
                _cDWithDataApp.$
            ) as any;
        }
    ) as any;
}

export function pConstrToData( fieldsTypes: DataType[] ): TermFn<[ PInt, PList<PData> ], PDataConstr>
{
    return addApplications<[ PInt, PList<PData> ], PDataConstr >(
        new Term(
            Type.Fn([ Type.Int, Type.List( Type.Data.Any ) ], Type.Data.Constr( fieldsTypes ) ),
            _dbn => Builtin.constrData
        )
    );
}

export function pMapToData<DataKey extends DataType, DataVal extends DataType>
    ( keyT: DataKey, valT: DataVal )
    : TermFn<[ PMap<PDataKey, PDataVal> ], PDataMap<PDataKey, PDataVal>>
{
    return addApplications<[ PList<PPair<PDataKey, PDataVal>> ], PDataMap<PDataKey, PDataVal> >(
        new Term(
            _dbn => Builtin.mapData,
            makePLamObj( new PList([ new PPair( new keyCtor, new valCtor ) ]), new PData )
        )
    );
}

export function pListToData<PDataListElem extends PData>
    ( dataListElemCtor: new () => PDataListElem )
    : TermFn<[ PList<PDataListElem> ], PDataList<PDataListElem> >
{
    return addApplications<[ PList<PDataListElem> ], PDataList<PDataListElem>>(
        new Term(
            _dbn => Builtin.listData,
            makePLamObj( new PList([ new dataListElemCtor ]), new PDataList )
        )
    );
} 

export const pIntToData: TermFn<[ PInt ], PDataInt > 
    = addApplications<[ PInt ], PData >(
        new Term<PLam<PInt, PData >>(
            _dbn => Builtin.iData,
            new PLam( new PInt, new PData )
        )
    );

export const pBSToData: TermFn<[ PByteString ], PDataBS > 
    = addApplications<[ PByteString ], PData >(
        new Term<PLam<PByteString, PData >>(
            _dbn => Builtin.bData,
            new PLam( new PByteString, new PData )
        )
    );

export const punConstrData: TermFn<[ PDataConstr ], PPair<PInt, PList<PData>>>
    = addApplications<[ PDataConstr ], PPair<PInt, PList<PData>>>(
        new Term(
            _dbn => Builtin.unConstrData,
            new PLam( new PDataConstr, new PPair( new PInt, new PList([ new PData ]) ) )
        )
    );
    
export function punMapData<PDataKey extends PData, PDataVal extends PData>
    ( keyCtor: new () => PDataKey, valCtor: new () => PDataVal )
    : TermFn<[ PData ], PList<PPair<PData, PData>>>
    {
        return addApplications<[ PData ], PList<PPair<PData, PData>>>(
            new Term(
                _dbn => Builtin.unMapData,
                new PLam( new PData, new PList([ new PPair( new keyCtor, new valCtor ) ]))
            )
        );

    }

export const punListData: TermFn<[ PData ], PList<PData>>
    = addApplications<[ PData ], PList<PData>>(
        new Term(
            _dbn => Builtin.unListData,
            new PLam( new PData, new PList([ new PData ]))
        )
    );

export const punIData: TermFn<[ PDataInt ], PInt>
    = addApplications<[ PDataInt ], PInt>(
        new Term(
            _dbn => Builtin.unIData,
            new PLam( new PData, new PInt)
        )
    );

export const punBData: Term<PLam<PDataBS, PByteString>>
& {
    $: ( dataBS: Term<PDataBS> ) => TermBS
} = (() => {
    const unBData = new Term(
        _dbn => Builtin.unBData,
        new PLam( new PDataBS, new PByteString)
    );

    return ObjectUtils.defineReadOnlyProperty(
        unBData,
        "$",
        ( dataBS: Term<PDataBS> ): TermBS =>
            addPByteStringMethods( papp( PByteString )( unBData, dataBS ) )
    );
})()

export const peqData: TermFn<[ PData, PData ], PBool >
    = addApplications<[ PData, PData ], PBool >(
        new Term<PLam<PData, PLam< PData, PBool > >>(
            _dbn => Builtin.equalsData,
            new PLam( new PData, new PLam( new PData, new PBool ) )
        )
    );

export function peq<PT extends PInt | PByteString | PString | PData >( pt: new () => PT )
    : TermFn<[ PT, PT ], PBool >
{
    if( pt.prototype === PInt.prototype )           return peqInt as any;
    if( pt.prototype === PByteString.prototype )    return peqBs as any;
    if( pt.prototype === PData.prototype )          return peqData as any;
    if( pt.prototype === PString.prototype )        return peqStr as any

    /**
     * @fixme add proper error
    */
    throw new BasePlutsError(
        "unsupported low level equality using 'peq'"
    );
}

export const ppairData: TermFn<[ PData, PData ], PPair<PData,PData> >
    = addApplications<[ PData, PData ], PPair<PData,PData> >(
        new Term<PLam<PData, PLam< PData, PPair<PData,PData> > >>(
            _dbn => Builtin.mkPairData,
            new PLam( new PData, new PLam( new PData, new PPair( new PData, new PData ) ) )
        )
    );

/**
 * @fixme **hoist**
 */
export const pnilData: Term<PList< PData > >
    = new Term(
        _dbn => new Application( Builtin.mkNilData, UPLCConst.unit ),
        new PList([ new PData ])
    );

/**
 * @fixme **hoist**
 */
export const pnilPairData: Term<PList< PPair<PData, PData>>>
    = new Term(
        _dbn => new Application( Builtin.mkNilPairData, UPLCConst.unit ),
        new PList([ new PPair( new PData, new PData) ])
    );

export function pnil<PListElem extends PData | PPair<PData,PData> >( elemT: new () => PListElem )
    : Term<PList< PListElem > >
{
    if( elemT.prototype === PData.prototype )
    {
        return pnilData as any;
    }
    if( elemT.prototype === PPair.prototype )
    {
        return pnilPairData as any;
    }

    /**
     * @fixme add proper error
    */
     throw new BasePlutsError(
        "unsupported low level 'nil' element'"
    );
}


// --------------------------------------------------------------------------------------------------------------------- //
// ----------------------------------------------- [ VASIL (Plutus V2) ] ----------------------------------------------- //
// --------------------------------------------------------------------------------------------------------------------- //

export const pserialiseData: TermFn<[ PData ], PByteString >
    = addApplications<[ PData ], PByteString >(
        new Term(
            _dbn => Builtin.serialiseData,
            new PLam( new PData, new PByteString )
        )
    );

/**
 * performs elliptic curve digital signature verification (ANSI [2005, 2020], Johnson and Menezes)
 * over the secp256k1 curve (see Certicom Research [2010], §2.4.1) and conforms to the interface described in
 * Note 5 of Section A.2. The arguments must have the following sizes:
 * • 𝑘: 64 bytes
 * • 𝑚: 32 bytes
 * • 𝑠: 64 bytes.
 * The ECDSA scheme admits two distinct valid signatures for a given message and private key. We follow
 * the restriction imposed by Bitcoin (see Lau and Wuilie [2016], LOW_S) and only accept the smaller
 * signature: verifyEcdsaSecp256k1Signature will return false if the larger one is supplied.
 * 
 * @param {PByteString} key ```PByteString``` of length 32 ( ```PubKeyHash``` )
 * @param {PByteString} message ```PByteString``` of length 32
 * @param {PByteString} signature ```PByteString``` of length 64
 * @returns {PBool} 
 * 
 * @throws
 * @fails
 */
export const pverifySecp256k1ECDSA: TermFn<[ PByteString, PByteString, PByteString ], PBool > =
    addApplications<[ PByteString, PByteString, PByteString ], PBool >(
        new Term(
            _dbn => Builtin.verifyEcdsaSecp256k1Signature,
            new PLam( new PByteString , new PLam( new PByteString , new PLam( new PByteString , new PBool ) ) )
        )
    );

/**
 * performs verification of Schnorr signatures ( Schnorr [1989], Lau et al. [2020]) over the secp256k1 curve
 * 
 * @param {PByteString} key ```PByteString``` of length 64
 * @param {PByteString} message abitrary length ```PByteString```
 * @param {PByteString} signature ```PByteString``` of length 64
 * @returns {PBool} 
 * 
 * @throws
 * @fails
 */
export const pverifySecp256k1Schnorr: TermFn<[ PByteString, PByteString, PByteString ], PBool > =
    addApplications<[ PByteString, PByteString, PByteString ], PBool >(
        new Term(
            _dbn => Builtin.verifySchnorrSecp256k1Signature,
            new PLam( new PByteString , new PLam( new PByteString , new PLam( new PByteString , new PBool ) ) )
        )
    );