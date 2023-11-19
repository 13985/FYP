using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;

public class MoveControlPanel : MonoBehaviour,IDragHandler{
    [SerializeField]private RectTransform panelRectTF;
    
    public void OnDrag(PointerEventData eventData){
        panelRectTF.anchoredPosition+=eventData.delta;
    }
}
