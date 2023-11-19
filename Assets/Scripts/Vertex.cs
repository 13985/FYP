using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

[RequireComponent(typeof(SpriteRenderer))]
public class Vertex : MonoBehaviour{
    private static Color edgeColor;
    public bool showEdge;
    [SerializeField]private GameObject[] neighbour;
    public GameObject[] Neighbour{get{return neighbour;}}

    static Vertex(){
        edgeColor=Color.white;
    }
    
    public void OnDrawGizmos(){
        if(!showEdge){return;}
        Gizmos.color=edgeColor;
        Vector3 from,to;
        for(int i=0;i<neighbour.Length;i++){
            from=transform.position;
            to=neighbour[i].transform.position;
            Handles.zTest=UnityEngine.Rendering.CompareFunction.LessEqual;
            Vector3 rotatedRadiusVector=Vector3.ClampMagnitude(to-from,0.5f);
            //Gizmos.DrawLine(from+rotatedRadiusVector,to-rotatedRadiusVector);
            Handles.DrawLine(from+rotatedRadiusVector,to-rotatedRadiusVector);
        }
    }
}
